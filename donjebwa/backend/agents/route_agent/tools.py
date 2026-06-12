"""
동선 검증 도구 (backend/agents/route_agent/tools.py)

시나리오 2 협상의 방아쇠. 혼잡 시간대에 인기 장소가 많으면 코스를 '반려'한다.
이 판정이 결정론적이어야 발표장에서 협상이 100% 재현된다.

규칙(데모용 단순화):
- when이 주말/점심·오후 피크면 popular=True 장소는 '혼잡'으로 본다.
- 혼잡 빼고 쓸 수 있는 장소가 3곳 미만이면 반려(ok=false) + 혼잡 장소 명단 반환.
- 충분하면 통과(ok=true) + 코스 확정.
DEMO_MODE=false에서 서울시 실시간 혼잡도(integrations/seoul_city)로 교체 가능.
"""

_PEAK_DAYS = ["토요일", "일요일", "주말"]
_PEAK_HOURS = ["11시", "12시", "13시", "14시", "15시", "점심", "정오", "오후"]


def _is_peak(when: str | None) -> bool:
    if not when:
        return False
    return any(d in when for d in _PEAK_DAYS) or any(h in when for h in _PEAK_HOURS)


def verify_route(candidates: list, when: str | None = None) -> dict:
    """
    후보들의 혼잡/적합성을 검증해 코스를 확정하거나 반려한다.
    - candidates: 장소 에이전트가 넘긴 후보 리스트(각 항목에 popular 플래그 포함)
    - when: 방문 시간대 문자열
    반환:
      통과 → {"ok": true,  "stops": [...], "reason": "...", "rejected": []}
      반려 → {"ok": false, "stops": [],    "reason": "...", "rejected": [장소명, ...]}
    """
    peak = _is_peak(when)
    rejected = [c["name"] for c in candidates if peak and c.get("popular")]
    usable = [c for c in candidates if not (peak and c.get("popular"))]

    if len(usable) < 3:
        return {
            "ok": False,
            "stops": [],
            "reason": f"{when or '해당 시간대'} 혼잡으로 코스 구성 불가 (가용 {len(usable)}곳)",
            "rejected": rejected,
        }

    stops = [
        {
            "name": c["name"],
            "category": c.get("category"),
            "address": c.get("address"),
            "lat": c.get("lat"),
            "lng": c.get("lng"),
            "note": "한산한 곳으로 선정" if peak else "여유로운 시간대",
        }
        for c in usable[:5]
    ]
    return {"ok": True, "stops": stops, "reason": "검증 통과", "rejected": []}
