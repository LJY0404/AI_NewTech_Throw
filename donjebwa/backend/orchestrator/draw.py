"""
지역 추첨 (backend/orchestrator/draw.py)

구 '운명 에이전트'. 가중치 기반 랜덤 추첨이라 LLM도 독립 서버도 필요 없어
오케스트레이터 안의 순수 파이썬 로직으로 흡수했다. (인구감소지역 가중치는 제거됨)

data/region_pool.json 형식:
  [{"name": "양평", "weight": 1.0}, {"name": "강릉", "weight": 2.5}, ...]
  weight = 기본 인기도. 클수록 자주 뽑힘.
"""
import json
import random
from pathlib import Path

from core.config import settings

# strength → 가중치 지수. '상'일수록 덜 알려진 곳(낮은 weight)이 잘 뽑히게 뒤집는다.
_STRENGTH_EXP = {"하": 1.0, "중": 0.0, "상": -1.0}

_pool_cache: list[dict] | None = None


def _load_pool() -> list[dict]:
    global _pool_cache
    if _pool_cache is None:
        path = Path(settings.REGION_POOL_PATH)
        _pool_cache = json.loads(path.read_text(encoding="utf-8"))
    return _pool_cache


def draw_region(strength: str = "중", exclude: list[str] | None = None) -> str:
    """
    가중 랜덤으로 지역 하나를 뽑는다.
    - strength: 상/중/하 (운명 강도)
    - exclude: 재추첨 시 이미 실패한 지역 제외
    """
    exclude_set = set(exclude or [])
    candidates = [r for r in _load_pool() if r["name"] not in exclude_set]
    if not candidates:
        raise ValueError("추첨 가능한 지역이 없습니다 (exclude가 풀 전체를 덮음).")

    exp = _STRENGTH_EXP.get(strength, 0.0)
    weights = [max(r.get("weight", 1.0), 0.01) ** exp for r in candidates]
    chosen = random.choices(candidates, weights=weights, k=1)[0]
    return chosen["name"]
