"""
던지기 라우터 (backend/app/api/routes_throw.py)

POST /api/throw — 시나리오 2(계획형) 진입점.
사용자 입력을 오케스트레이터에 넘기고, 협상 루프를 거친 최종 코스를 받아 반환한다.

DB 저장·노션 적재는 오케스트레이터가 수행한다(시나리오 1 스케줄러와 동일 경로를
타게 하려고 일부러 라우터에서 빼뒀다). 이 라우터는 HTTP 입출력만 담당한다.
"""
from fastapi import APIRouter

from app.schemas.throw import ThrowRequest, CourseCard
from orchestrator.orchestrator import run as run_orchestrator

router = APIRouter()


@router.post("/throw", response_model=CourseCard)
async def throw(req: ThrowRequest) -> CourseCard:
    """사용자 입력 기반 코스 던지기. 진행 과정은 /api/stream에서 실시간으로 볼 수 있다."""
    return await run_orchestrator(mode="planned", request=req)
