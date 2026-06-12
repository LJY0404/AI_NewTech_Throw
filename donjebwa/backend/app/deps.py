"""
공통 의존성 (backend/app/deps.py)

지금은 DB 세션 하나뿐이다. 인증/현재유저 같은 게 생기면 여기에 추가한다.
"""
from collections.abc import Generator

from sqlalchemy.orm import Session

from core.db import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """요청 단위 DB 세션. 끝나면 무조건 닫는다."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
