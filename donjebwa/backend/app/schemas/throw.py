"""
던지기 요청·결과 스키마 (backend/app/schemas/throw.py)

ThrowRequest  : 시나리오 2(계획형) 사용자 입력
CourseCard    : 최종 결과. 프론트 표시 + 노션 적재 + DB 저장에 공통으로 쓰인다.

오케스트레이터(orchestrator.run)가 CourseCard를 반환하도록 맞춰져 있다.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Companion(str, Enum):
    """동행 유형 — 스토리텔러 톤 분기의 기준이 된다."""
    solo = "혼자"
    friend = "친구"
    couple = "커플"


class ThrowMode(str, Enum):
    auto = "auto"        # 시나리오 1: 오케스트레이터가 지역 추첨
    planned = "planned"  # 시나리오 2: 사용자가 지역 입력


class ThrowRequest(BaseModel):
    """시나리오 2 — 사용자 입력 던지기 (POST /api/throw 바디)."""
    region: str = Field(..., description="가고 싶은 지역", examples=["성수"])
    when: Optional[str] = Field(None, description="방문 시간대", examples=["토요일 14시"])
    companion: Companion = Field(default=Companion.couple, description="동행 유형")
    mood: Optional[str] = Field(None, description="원하는 분위기/취향", examples=["조용한 분위기"])


class CourseStop(BaseModel):
    """코스를 구성하는 장소 한 곳."""
    name: str
    category: Optional[str] = None        # 카페 / 식당 / 전시 ...
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None            # 동선 에이전트가 붙이는 한 줄 (예: "14시 한산")


class CourseCard(BaseModel):
    """최종 결과 카드."""
    mode: ThrowMode
    region: str
    companion: Companion
    stops: list[CourseStop] = Field(default_factory=list)
    story: str = ""                       # 스토리텔러 내러티브
    notion_url: Optional[str] = None      # 적재된 노션 페이지 링크
    created_at: datetime = Field(default_factory=datetime.now)
