"""
ORM 모델 (backend/core/models.py)

ThrowRecord — 던진 결과 1건. orchestrator._persist가 쓰고,
routes_history가 읽는다. 두 쪽 필드 이름이 여기 정의와 정확히 맞아야 한다.
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class ThrowRecord(Base):
    __tablename__ = "throw_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mode: Mapped[str] = mapped_column(String(16))             # auto / planned
    region: Mapped[str] = mapped_column(String(64))
    companion: Mapped[str] = mapped_column(String(16))        # 혼자 / 친구 / 커플
    course_json: Mapped[str] = mapped_column(Text)            # CourseStop 리스트(JSON 문자열)
    story: Mapped[str] = mapped_column(Text, default="")
    notion_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="예정")  # 예정 / 완료
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
