"""
장소 후보 추출 도구 (backend/agents/place_agent/tools.py)

DEMO_MODE에선 data/place_cache/{region}.json을 읽는다.
실데이터(TourAPI+카카오)는 키 승인 후 여기 _load_pool만 교체하면 된다.

핵심 동작:
- 첫 호출(avoid_crowded=False): 인기 장소를 앞에 채운다 → 혼잡 시간대면 동선이 반려.
- 재요청(avoid_crowded=True): 인기(혼잡) 장소를 빼고 한산한 곳 위주로 → 동선 통과.
이 두 동작이 시나리오 2의 협상 루프를 성립시킨다.
"""
import json
from pathlib import Path

from core.config import settings


def _load_pool(region: str) -> list[dict]:
    path = Path(settings.PLACE_CACHE_DIR) / f"{region}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    # 캐시 없는 지역(자동 추첨이 뽑을 수 있음) → 데모가 안 죽게 일반 후보 생성
    return [
        {"name": f"{region} 대표 명소", "category": "명소", "popular": True},
        {"name": f"{region} 로컬 카페", "category": "카페", "popular": False},
        {"name": f"{region} 골목 산책로", "category": "산책", "popular": False},
        {"name": f"{region} 전통시장", "category": "시장", "popular": False},
        {"name": f"{region} 전망 좋은 쉼터", "category": "명소", "popular": False},
    ]


def search_places(
    region: str,
    avoid_crowded: bool = False,
    exclude_places: list[str] | None = None,
) -> dict:
    """
    지역의 장소 후보를 추출한다.
    - region: 지역명
    - avoid_crowded: True면 혼잡한 인기 장소를 빼고 한산한 곳 위주로 추출(재요청용)
    - exclude_places: 이미 반려돼 제외할 장소명 리스트
    반환: {"candidates": [{name, category, address, lat, lng, popular}, ...]}
    """
    exclude = set(exclude_places or [])
    pool = [p for p in _load_pool(region) if p["name"] not in exclude]

    if avoid_crowded:
        selected = [p for p in pool if not p.get("popular")][:5]
    else:
        popular = [p for p in pool if p.get("popular")]
        quiet = [p for p in pool if not p.get("popular")]
        selected = (popular + quiet)[:5]

    return {"candidates": selected}
