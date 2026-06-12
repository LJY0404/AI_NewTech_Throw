"""
협상 로직 (backend/orchestrator/negotiation.py)

시나리오 2의 핵심. 동선 에이전트가 코스를 '반려'하면, 장소 에이전트에
보낼 재요청 payload를 만든다. 결정·payload 생성만 담당하는 순수 함수라
테스트하기 쉽고, 실제 호출 루프는 orchestrator.py가 돈다.

★ LLM에 위임하지 않고 명시적 파이썬으로 판정한다 → 발표장에서 협상 장면이
   100% 재현된다.

동선 에이전트 응답 규약:
  {"ok": bool, "stops": [...], "reason": str, "rejected": [장소명, ...]}
"""
from typing import Any


def needs_retry(route_resp: dict[str, Any]) -> bool:
    """동선 검증이 코스를 못 짰으면(부적합) 재협상이 필요하다."""
    return not route_resp.get("ok", False)


def build_retry_request(prev_place_req: dict[str, Any], route_resp: dict[str, Any]) -> dict[str, Any]:
    """
    이전 장소 요청을 바탕으로 보강된 재요청을 만든다.
    - 혼잡 회피 강제(avoid_crowded=True)
    - 반려된 장소들은 다음 추출에서 제외
    """
    rejected = route_resp.get("rejected", [])
    new_req = dict(prev_place_req)
    new_req["avoid_crowded"] = True
    new_req["exclude_places"] = list(set(prev_place_req.get("exclude_places", [])) | set(rejected))
    return new_req
