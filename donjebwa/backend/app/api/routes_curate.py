"""
수동 큐레이션 라우터 (backend/app/api/routes_curate.py)

POST /api/curate — 시나리오 1(완전 자동 큐레이션)을 '사람이 원할 때 1회만' 실행한다.

평소엔 스케줄러를 꺼두고(SCHEDULER_ENABLED=false) 토큰을 아끼다가, 발표 시연 때
이 엔드포인트를 한 번 호출해 "버튼 한 번 = 계획 전체 1회 추천"을 보여준다.
진행 과정은 /api/stream(SSE)에서 실시간으로 관찰된다.
"""
from fastapi import APIRouter

from app.schemas.throw import CourseCard
from orchestrator.orchestrator import run as run_orchestrator

router = APIRouter()


@router.post("/curate", response_model=CourseCard)
async def curate() -> CourseCard:
    """자동 큐레이션(추첨 기반) 1회 실행."""
    return await run_orchestrator(mode="auto")
