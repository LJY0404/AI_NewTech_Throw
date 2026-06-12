"""
DB 연결 (backend/core/db.py)

SQLAlchemy 엔진 + 세션 + Base. SQLite로 시작하고, DATABASE_URL만 바꾸면
PostgreSQL로 갈 수 있다.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings

# SQLite는 멀티스레드(요청 + 스케줄러 잡) 접근 위해 check_same_thread=False 필요
_connect_args = (
    {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def init_db() -> None:
    """테이블 생성. 앱 시작 시 1회 호출(main.py lifespan)."""
    from core import models  # noqa: F401  — 모델 등록을 위해 import 필요
    Base.metadata.create_all(bind=engine)
