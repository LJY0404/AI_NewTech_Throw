"""
이벤트 버스 (backend/orchestrator/events.py)

오케스트레이터가 단계마다 emit() → 구독 중인 /api/stream(SSE)들로 브로드캐스트.
구독자가 없어도(패널 안 띄워도) 파이프라인은 그대로 돈다 — 이벤트는 그냥 버려진다.

데모 핵심: 시나리오 2의 "반려 → 재요청" 이벤트가 여기로 흘러 평가자 화면에 뜬다.
"""
import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any, Optional

from app.schemas.event import AgentEvent, EventStage

logger = logging.getLogger("donjebwa.events")


class EventBus:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[AgentEvent]] = set()

    async def publish(self, event: AgentEvent) -> None:
        for q in list(self._subscribers):
            await q.put(event)

    async def subscribe(self) -> AsyncIterator[AgentEvent]:
        """SSE 연결 하나당 큐 하나. 연결이 끊기면 구독 해제된다."""
        q: asyncio.Queue[AgentEvent] = asyncio.Queue()
        self._subscribers.add(q)
        try:
            while True:
                yield await q.get()
        finally:
            self._subscribers.discard(q)


event_bus = EventBus()


async def emit(
    stage: EventStage,
    actor: str,
    message: str,
    payload: Optional[dict[str, Any]] = None,
) -> None:
    """오케스트레이터가 쓰는 단축 함수. 로그도 같이 남긴다."""
    logger.info("[%s] %s — %s", stage.value, actor, message)
    await event_bus.publish(
        AgentEvent(stage=stage, actor=actor, message=message, payload=payload)
    )
