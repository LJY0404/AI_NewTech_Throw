"""
오케스트레이터 (backend/orchestrator/orchestrator.py)

run() 하나가 두 시나리오의 공통 진입점이다.
- mode="auto"    : 시나리오 1. draw로 지역 추첨 → 매끄러운 파이프라인 (스케줄러가 호출)
- mode="planned" : 시나리오 2. 사용자 입력 지역 → 협상 루프 발생 (POST /api/throw가 호출)

흐름: (추첨) → 장소 → 동선 →〔반려 시 재요청 루프〕→ 스토리텔러 → 노션 적재 → DB 저장
각 단계는 events.emit으로 SSE 패널에 실시간 중계된다.

─────────────────────────────────────────────────────────────────────────
에이전트 JSON 입출력 규약 (ADK 에이전트 instruction을 여기에 맞춰 작성할 것)

[장소] 요청 {region, mood?, when?, avoid_crowded:bool, exclude_places:[str]}
       응답 {candidates:[{name,category,address,lat,lng}]}
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


async def run(mode: str, request: ThrowRequest | None = None) -> CourseCard:
    throw_mode = ThrowMode(mode)

    # 1) 지역 결정 ----------------------------------------------------------
    if throw_mode is ThrowMode.auto:
        region = draw.draw_region(strength="중")
        companion = Companion.solo          # 무인 자동 큐레이션 → 중립 톤
        when = mood = None
        await emit(EventStage.draw, "orchestrator", f"이번 운명 추첨: {region}")
    else:
        if request is None:
            raise ValueError("planned 모드는 ThrowRequest가 필요합니다.")
        region = request.region
        companion = request.companion
        when = request.when
        mood = request.mood
        await emit(EventStage.draw, "orchestrator", f"사용자 입력 지역: {region} ({companion.value})")

    # 2) 장소 후보 ----------------------------------------------------------
    place_req = {
        "region": region,
        "mood": mood,
        "when": when,
        "avoid_crowded": False,
        "exclude_places": [],
    }
    place_resp = await call_agent(registry.PLACE, place_req)
    await emit(
        EventStage.place, "place_agent",
        f"{region} 후보 {len(place_resp.get('candidates', []))}곳 추출",
        payload=place_resp,
    )

    # 3) 동선 검증 + 협상 루프 ----------------------------------------------
    route_req = {"candidates": place_resp.get("candidates", []), "when": when}
    route_resp = await call_agent(registry.ROUTE, route_req)
    await emit(EventStage.route, "route_agent", _route_msg(route_resp), payload=route_resp)

    retries = 0
    while negotiation.needs_retry(route_resp) and retries < MAX_RETRIES:
        retries += 1
        await emit(
            EventStage.negotiation, "orchestrator",
            f"동선 부적합 → 장소 에이전트에 재요청 ({retries}/{MAX_RETRIES}): {route_resp.get('reason', '')}",
        )
        place_req = negotiation.build_retry_request(place_req, route_resp)
        place_resp = await call_agent(registry.PLACE, place_req)
        await emit(
            EventStage.place, "place_agent",
            f"보강 후보 {len(place_resp.get('candidates', []))}곳 재추출 (혼잡 회피)",
            payload=place_resp,
        )
        route_req = {"candidates": place_resp.get("candidates", []), "when": when}
        route_resp = await call_agent(registry.ROUTE, route_req)
        await emit(EventStage.route, "route_agent", _route_msg(route_resp), payload=route_resp)

    stops = [CourseStop(**s) for s in route_resp.get("stops", [])]

    # 4) 스토리텔러 ---------------------------------------------------------
    story_req = {
        "region": region,
        "companion": companion.value,
        "stops": [s.model_dump() for s in stops],
    }
    story_resp = await call_agent(registry.STORYTELLER, story_req)
    story = story_resp.get("story", "")
    await emit(EventStage.storyteller, "storyteller_agent", f"{companion.value} 톤 내러티브 생성 완료")

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
        await emit(EventStage.notion, "orchestrator", "노션 운명 일지에 저장됨", payload={"url": card.notion_url})
    except Exception as exc:  # 노션 실패가 전체 흐름을 막지 않게
        logger.warning("노션 적재 실패: %s", exc)
        await emit(EventStage.notion, "orchestrator", f"노션 적재 실패(무시하고 진행): {exc}")

    _persist(card)
    await emit(EventStage.done, "orchestrator", f"완료 — {region} {len(stops)}곳 코스")
    return card


def _route_msg(route_resp: dict) -> str:
    if route_resp.get("ok"):
        return f"검증 통과 — {len(route_resp.get('stops', []))}곳 확정"
    return f"코스 부적합 반려 — {route_resp.get('reason', '사유 미상')}"


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
