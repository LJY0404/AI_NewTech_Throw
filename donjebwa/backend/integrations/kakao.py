"""
카카오 로컬 연동 (backend/integrations/kakao.py)

카카오 로컬 '키워드 장소 검색'으로 실제 존재하는 장소(이름·주소·좌표)를 가져온다.
무료(하루 10만건), 승인 대기 없음. REST API 키만 있으면 됨.

코스 구성을 위해 지역마다 여러 키워드(취향 + 관광명소/카페/맛집)로 검색해 합친다.
동기(sync) 함수다 — ADK 도구 안에서 그대로 호출하기 위함.
"""
import logging

import httpx

from core.config import settings

logger = logging.getLogger("donjebwa.kakao")

_KAKAO_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
_DEFAULT_KEYWORDS = ["관광명소", "카페", "맛집"]


def search_course_candidates(region: str, mood: str | None = None, size: int = 5) -> list[dict]:
    """region의 장소 후보를 카카오에서 모아 정규화해 반환한다(키워드별 병합·중복 제거)."""
    keywords = list(_DEFAULT_KEYWORDS)
    if mood:
        keywords.insert(0, mood)  # '조용한 분위기' 같은 취향을 먼저 검색해 상위에 배치

    headers = {"Authorization": f"KakaoAK {settings.KAKAO_REST_KEY}"}
    seen: set[str] = set()
    merged: list[dict] = []

    with httpx.Client(timeout=10) as client:
        for kw in keywords:
            try:
                r = client.get(
                    _KAKAO_URL,
                    headers=headers,
                    params={"query": f"{region} {kw}", "size": size},
                )
                r.raise_for_status()
                docs = r.json().get("documents", [])
            except Exception as exc:
                logger.warning("카카오 검색 실패 (%s %s): %s", region, kw, exc)
                continue

            for d in docs:
                name = d.get("place_name", "")
                if not name or name in seen:
                    continue
                seen.add(name)
                merged.append(_normalize(d))

    return merged


def _normalize(doc: dict) -> dict:
    cat = doc.get("category_name", "")
    short_cat = cat.split(" > ")[-1] if cat else None

    def _f(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    return {
        "name": doc.get("place_name"),
        "category": short_cat,
        "address": doc.get("road_address_name") or doc.get("address_name"),
        "lat": _f(doc.get("y")),   # y=위도
        "lng": _f(doc.get("x")),   # x=경도
        "place_url": doc.get("place_url"),
    }
