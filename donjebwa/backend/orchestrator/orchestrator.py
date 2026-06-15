"""
오케스트레이터 (backend/orchestrator/orchestrator.py)

run() 하나가 두 시나리오의 공통 진입점이다.
- mode="auto"    : 시나리오 1. draw로 지역 추첨 → 매끄러운 파이프라인 (스케줄러/수동 트리거가 호출)
- mode="planned" : 시나리오 2. 사용자 입력 지역 → 협상 루프 발생 (POST /api/throw가 호출)

흐름: (추첨) → 장소 → 동선 →〔반려 시 재요청 루프〕→ 스토리텔러 → 노션 적재 → DB 저장
각 단계는 events.emit으로 SSE 패널에 실시간 중계된다.

★ 판단 근거(reasoning)는 에이전트가 아니라 '오케스트레이터가 직접' 조립한다.
   LLM을 거치며 긴 한글이 변형/누락되는 걸 막고, 발표장에서 100% 재현되게 하기 위함.
   에이전트는 구조화 데이터(candidates / ok·stops·rejected)만 돌려주면 된다.

─────────────────────────────────────────────────────────────────────────
에이전트 JSON 입출력 규약
[장소] 요청 {region, mood?, when?, avoid_crowded:bool, exclude_places:[str]}
       응답 {candidates:[{name,category,address,lat,lng,popular}]}
[동선] 요청 {candidates:[...], when?}
       응답 {ok:bool, stops:[{name,category,address,lat,lng,note}], reason, rejected:[str]}
[스토리] 요청 {region, companion, stops:[...]}
        응답 {story:str}
─────────────────────────────────────────────────────────────────────────
"""
import json
import logging

from app.schemas.throw import (
    Companion,
    CourseCard,
    CourseStop,
    ThrowMode,
    ThrowRequest,
)
from app.schemas.event import EventStage
from core.db import SessionLocal
from core import models
from integrations import notion
from orchestrator import draw, negotiation, registry
from orchestrator.client import call_agent
from orchestrator.events import emit

logger = logging.getLogger("donjebwa.orchestrator")

MAX_RETRIES = 2  # 협상 재요청 최대 횟수 (무한루프 방지)

_TONE = {
    "혼자": "차분하고 사색적인",
    "친구": "활기차고 유쾌한",
    "커플": "설레고 다정한",
}


async def run(mode: str, request: ThrowRequest | None = None) -> CourseCard:
    throw_mode = ThrowMode(mode)

    # 1) 지역 결정 ----------------------------------------------------------
    if throw_mode is ThrowMode.auto:
        region = draw.draw_region(strength="중")
        companion = Companion.solo          # 무인 자동 큐레이션 → 중립 톤
        when = mood = None
        await emit(
            EventStage.draw, "orchestrator",
            f"이번 운명 추첨: {region}",
            reasoning=_draw_reasoning_auto(region),
        )
    else:
        if request is None:
            raise ValueError("planned 모드는 ThrowRequest가 필요합니다.")
        region = request.region
        companion = request.companion
        when = request.when
        mood = request.mood
        await emit(
            EventStage.draw, "orchestrator",
            f"사용자 입력 지역: {region} ({companion.value})",
            reasoning=_draw_reasoning_planned(region, when, companion.value, mood),
        )

    # 2) 장소 후보 ----------------------------------------------------------
    place_req = {
        "region": region,
        "mood": mood,
        "when": when,
        "avoid_crowded": False,
        "exclude_places": [],
    }
    place_resp = await call_agent(registry.PLACE, place_req)
    await _emit_place(region, place_resp, avoid_crowded=False, retry=False)

    # 3) 동선 검증 + 협상 루프 ----------------------------------------------
    route_req = {"candidates": place_resp.get("candidates", []), "when": when}
    route_resp = await call_agent(registry.ROUTE, route_req)
    await _emit_route(route_resp, place_resp.get("candidates", []), when, mood, companion)

    retries = 0
    while negotiation.needs_retry(route_resp) and retries < MAX_RETRIES:
        retries += 1
        rejected = route_resp.get("rejected", [])
        await emit(
            EventStage.negotiation, "orchestrator",
            f"동선 부적합 → 장소 에이전트에 재요청 ({retries}/{MAX_RETRIES})",
            reasoning=_negotiation_reasoning(rejected),
        )
        place_req = negotiation.build_retry_request(place_req, route_resp)
        place_resp = await call_agent(registry.PLACE, place_req)
        await _emit_place(region, place_resp, avoid_crowded=True, retry=True)

        route_req = {"candidates": place_resp.get("candidates", []), "when": when}
        route_resp = await call_agent(registry.ROUTE, route_req)
        await _emit_route(route_resp, place_resp.get("candidates", []), when, mood, companion)

    stops = [CourseStop(**s) for s in route_resp.get("stops", [])]

    # 4) 스토리텔러 ---------------------------------------------------------
    story_req = {
        "region": region,
        "companion": companion.value,
        "stops": [s.model_dump() for s in stops],
    }
    story_resp = await call_agent(registry.STORYTELLER, story_req)
    story = story_resp.get("story", "")
    await emit(
        EventStage.storyteller, "storyteller_agent",
        f"{companion.value} 톤 내러티브 생성 완료",
        reasoning=_story_reasoning(companion.value, [s.model_dump() for s in stops]),
    )

    # 5) 결과 카드 조립 -----------------------------------------------------
    card = CourseCard(
        mode=throw_mode,
        region=region,
        companion=companion,
        stops=stops,
        story=story,
    )

    # 6) 노션 적재 + DB 저장 (시나리오 1·2 공통) ----------------------------
    try:
        card.notion_url = await notion.append_course(card)
        await emit(
            EventStage.notion, "orchestrator", "노션 운명 일지에 저장됨",
            reasoning="완성된 코스를 노션 '운명 일지' 데이터베이스에 새 페이지로 기록했습니다. "
                      "코스 카드와 스토리가 함께 저장되어, 나중에 다시 열어볼 수 있습니다.",
            payload={"url": card.notion_url},
        )
    except Exception as exc:  # 노션 실패가 전체 흐름을 막지 않게
        logger.warning("노션 적재 실패: %s", exc)
        await emit(EventStage.notion, "orchestrator", f"노션 적재 실패(무시하고 진행): {exc}")

    _persist(card)
    await emit(
        EventStage.done, "orchestrator",
        f"완료 — {region} {len(stops)}곳 코스",
        reasoning=f"{region} {len(stops)}곳으로 구성된 코스가 완성됐습니다. "
                  f"추첨/입력 → 장소 추천 → 동선 검증 → (필요 시 재협상) → 스토리 생성까지 "
                  f"에이전트들이 협업해 만든 결과입니다.",
    )
    return card


# ── 이벤트 emit 헬퍼 ───────────────────────────────────────────────────────

async def _emit_place(region: str, place_resp: dict, avoid_crowded: bool, retry: bool) -> None:
    cands = place_resp.get("candidates", [])
    msg = (
        f"보강 후보 {len(cands)}곳 재추출 (혼잡 회피)" if retry
        else f"{region} 후보 {len(cands)}곳 추출"
    )
    await emit(
        EventStage.place, "place_agent", msg,
        reasoning=_place_reasoning(region, cands, avoid_crowded),
        payload=place_resp,
    )


async def _emit_route(route_resp: dict, candidates: list, when, mood, companion) -> None:
    rejected = route_resp.get("rejected", [])
    if route_resp.get("ok"):
        stops = route_resp.get("stops", [])
        await emit(
            EventStage.route, "route_agent",
            f"검증 통과 — {len(stops)}곳 확정",
            reasoning=_route_pass_reasoning(when, stops),
            payload=route_resp,
        )
    else:
        usable = len([c for c in candidates if c.get("name") not in set(rejected)])
        await emit(
            EventStage.route, "route_agent",
            f"코스 부적합 반려 — {route_resp.get('reason', '사유 미상')}",
            reasoning=_route_reject_reasoning(when, mood, companion.value, rejected, usable),
            payload=route_resp,
        )


# ── reasoning(판단 근거) 조립기 — 모두 템플릿 기반(토큰 0, 100% 재현) ──────

def _names(items: list, limit: int = 5) -> str:
    got = [i.get("name", "") for i in items[:limit]]
    return ", ".join(n for n in got if n)


def _draw_reasoning_auto(region: str) -> str:
    return (
        f"이번 자동 큐레이션에서 운명의 지역으로 '{region}'이(가) 뽑혔습니다. "
        f"사용자 입력 없이 가중 추첨으로 선정했으며, 지금부터 {region}을(를) 중심으로 "
        f"장소·동선·스토리 에이전트가 차례로 협업해 하루 코스를 구성합니다."
    )


def _draw_reasoning_planned(region: str, when, companion: str, mood) -> str:
    cond = []
    if when:
        cond.append(f"방문 시점은 {when}")
    cond.append(f"동행은 {companion}")
    if mood:
        cond.append(f"원하는 분위기는 '{mood}'")
    return (
        f"사용자가 '{region}'을(를) 직접 선택했습니다. {', '.join(cond)}입니다. "
        f"이 조건을 장소·동선 에이전트에 전달해, 시간대와 취향에 맞는 코스를 짜보겠습니다."
    )


def _place_reasoning(region: str, candidates: list, avoid_crowded: bool) -> str:
    names = _names(candidates)
    n = len(candidates)
    if avoid_crowded:
        return (
            f"동선 에이전트의 반려를 반영했습니다. 붐비는 인기 장소를 제외하고, "
            f"{region}에서 한적하게 즐길 수 있는 곳 위주로 {n}곳을 다시 추렸습니다. "
            f"재추천 후보는 {names}입니다. 여유로운 코스가 되도록 구성을 보정했습니다."
        )
    return (
        f"{region} 일대에서 장소 후보를 탐색했습니다. 그중 접근성과 인지도가 높은 곳을 "
        f"우선해 {n}곳을 1차로 추천합니다: {names}. "
        f"이 후보들이 방문 시간대에 적합한지는 이어서 동선 에이전트가 검증합니다."
    )


def _route_pass_reasoning(when, stops: list) -> str:
    when_txt = when or "방문 시점"
    names = _names(stops)
    return (
        f"후보들의 {when_txt} 상황을 점검한 결과, 모두 여유롭게 둘러볼 수 있는 곳으로 판단했습니다. "
        f"이동 동선과 혼잡도에 큰 무리가 없어 {len(stops)}곳으로 코스를 확정합니다: {names}."
    )


def _route_reject_reasoning(when, mood, companion: str, rejected: list, usable_count: int) -> str:
    when_txt = when or "해당 시간대"
    rej_txt = "·".join(rejected) if rejected else "후보 중 인기 장소들"
    mood_clause = f"'{mood}' 분위기를 원하셨는데, " if mood else ""
    return (
        f"후보들의 {when_txt} 상황을 점검했습니다. {rej_txt}은(는) 이 지역에서 가장 붐비는 곳이라, "
        f"{when_txt}에는 입장 대기가 길고 사진 찍기도 어려울 만큼 혼잡할 것으로 예상됩니다. "
        f"{mood_clause}한적하게 즐길 수 있는 곳이 {usable_count}곳뿐이라 "
        f"{companion}이(가) 여유롭게 다닐 코스로는 무리입니다. "
        f"이 구성은 반려하고, 혼잡한 곳을 제외해 다시 짜달라고 장소 에이전트에 요청하겠습니다."
    )


def _negotiation_reasoning(rejected: list) -> str:
    rej_txt = "·".join(rejected) if rejected else "혼잡한 장소들"
    return (
        f"동선 에이전트가 혼잡을 이유로 코스를 반려했습니다. {rej_txt}을(를) 제외하고 "
        f"한적한 곳 위주로 다시 추천하도록, '혼잡 회피' 조건을 추가해 장소 에이전트에 재요청합니다. "
        f"단발성 추천이 아니라 에이전트 간 재협상으로 코스를 스스로 보정하는 단계입니다."
    )


def _story_reasoning(companion: str, stops: list) -> str:
    tone = _TONE.get(companion, "자연스러운")
    names = _names(stops)
    return (
        f"동행이 '{companion}'이라 {tone} 톤을 골랐습니다. "
        f"{names} 순서로 하루의 흐름이 자연스럽게 이어지도록 엮어 내러티브를 작성했습니다."
    )


def _persist(card: CourseCard) -> None:
    """던진 결과를 DB에 기록 (history 조회용)."""
    db = SessionLocal()
    try:
        record = models.ThrowRecord(
            mode=card.mode.value,
            region=card.region,
            companion=card.companion.value,
            course_json=json.dumps([s.model_dump() for s in card.stops], ensure_ascii=False),
            story=card.story,
            notion_url=card.notion_url,
            status="예정",
        )
        db.add(record)
        db.commit()
    finally:
        db.close()
