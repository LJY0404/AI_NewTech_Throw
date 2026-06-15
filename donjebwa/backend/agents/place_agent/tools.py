"""
장소 후보 추출 도구 (backend/agents/place_agent/tools.py)

DEMO_MODE=false  → 카카오 로컬 실데이터 (integrations.kakao)
DEMO_MODE=true   → data/place_cache/{region}.json (가짜 캐시)
실데이터 호출이 실패하면 캐시로 자동 폴백한다(발표 중 안전).

협상(시나리오 2)을 위해 'popular' 플래그가 필요한데, 카카오엔 혼잡도가 없으므로
검색 결과 상위 절반을 popular(=붐비는 인기 장소)로 추정한다.
- 첫 호출(avoid_crowded=False): 인기 장소 우선 → 혼잡 시간대면 동선이 반려
- 재요청(avoid_crowded=True): 인기 장소 제외, 한적한 곳 위주 → 통과
"""
import json
from pathlib import Path

from core.config import settings
from integrations import kakao


def _assign_popular(docs: list[dict]) -> list[dict]:
    """카카오는 인기·관련도 순으로 준다 → 상위 절반을 popular(혼잡)로 추정."""
    n = len(docs)
    half = max(1, n // 2)
    for i, d in enumerate(docs):
        d["popular"] = i < half
    return docs


def _generic_fallback(region: str) -> list[dict]:
    return [
        {"name": f"{region} 대표 명소", "category": "명소", "popular": True},
        {"name": f"{region} 로컬 카페", "category": "카페", "popular": False},
        {"name": f"{region} 골목 산책로", "category": "산책", "popular": False},
        {"name": f"{region} 전통시장", "category": "시장", "popular": False},
        {"name": f"{region} 전망 좋은 쉼터", "category": "명소", "popular": False},
    ]


def _load_pool(region: str) -> list[dict]:
    # 1) 실데이터 우선 (DEMO_MODE=false + 키 있음)
    if not settings.DEMO_MODE and settings.KAKAO_REST_KEY:
        try:
            docs = kakao.search_course_candidates(region)
            if docs:
                return _assign_popular(docs)
        except Exception:
            pass  # 실패 시 아래 캐시로 폴백

    # 2) 캐시
    path = Path(settings.PLACE_CACHE_DIR) / f"{region}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    # 3) 캐시도 없으면 일반 후보 생성(데모가 안 죽게)
    return _generic_fallback(region)


def search_places(
    region: str,
    avoid_crowded: bool = False,
    exclude_places: list[str] | None = None,
) -> dict:
    """
    지역의 장소 후보를 추출한다.
    - avoid_crowded: True면 혼잡한 인기 장소를 빼고 한적한 곳 위주로(재요청용)
    - exclude_places: 이미 반려돼 제외할 장소명
    반환: {"candidates": [{name, category, address, lat, lng, popular}, ...]}
    """
    exclude = set(exclude_places or [])
    pool = [p for p in _load_pool(region) if p.get("name") not in exclude]

    if avoid_crowded:
        selected = [p for p in pool if not p.get("popular")][:5]
    else:
        popular = [p for p in pool if p.get("popular")]
        quiet = [p for p in pool if not p.get("popular")]
        selected = (popular + quiet)[:5]

    return {"candidates": selected}
