"""
A2A 라이브 이벤트 스키마 (backend/app/schemas/event.py)

데모 핵심 — "Agent1 동작 → Agent2 동작 → 반려 → 재요청"이 평가자 눈에 보이게,
오케스트레이터가 단계마다 AgentEvent를 event_bus로 publish하고
/api/stream(SSE)이 그대로 프론트 패널에 흘린다.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class EventStage(str, Enum):
    draw = "draw"                 # 오케스트레이터 지역 추첨 (시나리오 1)
    place = "place"               # 장소 에이전트
    route = "route"               # 동선 검증 에이전트
    negotiation = "negotiation"   # 반려 감지 → 재요청 (시나리오 2 핵심)
    storyteller = "storyteller"   # 스토리텔러
    notion = "notion"             # 노션 적재
    done = "done"                 # 파이프라인 완료
    error = "error"


class AgentEvent(BaseModel):
    """SSE로 프론트 패널에 흘릴 단계별 이벤트 한 건."""
    stage: EventStage
    actor: str                                  # "orchestrator" / "place_agent" / "route_agent" ...
    message: str                                # 사람이 읽는 한 줄 (예: "성수 조용한 후보 전부 혼잡 → 반려")
    payload: Optional[dict[str, Any]] = None    # 디버그용 원본 (A2A Task 등, 선택)
    ts: datetime = Field(default_factory=datetime.now)
