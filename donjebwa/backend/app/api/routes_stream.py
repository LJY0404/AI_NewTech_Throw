"""
SSE 스트림 라우터 (backend/app/api/routes_stream.py)

GET /api/stream — 프론트 라이브 패널이 한 번 구독해두면, 시나리오 1·2의
모든 A2A 이벤트(추첨/장소/동선/반려/재요청/스토리/노션)가 실시간으로 흘러온다.

동작 구조
- 오케스트레이터가 단계마다 event_bus.publish(AgentEvent) 호출
- 이 라우터는 event_bus.subscribe()를 구독해 SSE로 중계
"""
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from orchestrator.events import event_bus

router = APIRouter()


@router.get("/stream")
async def stream(request: Request) -> EventSourceResponse:
    """A2A 이벤트 실시간 스트림."""

    async def event_generator():
        async for event in event_bus.subscribe():
            if await request.is_disconnected():
                break
            yield {
                "event": event.stage.value,        # 프론트가 stage별로 분기 가능
                "data": event.model_dump_json(),   # AgentEvent JSON
            }

    # ping: 15초마다 keep-alive (프록시가 유휴 연결 끊는 것 방지)
    return EventSourceResponse(event_generator(), ping=15)
