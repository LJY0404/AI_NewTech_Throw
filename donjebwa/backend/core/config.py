"""
설정 (backend/core/config.py)

모든 모듈이 여기서 settings를 읽는다. 값은 .env로 override.
에이전트 URL을 하드코딩하지 않고 env로 빼는 게 핵심 규약 — 도커/로컬을
코드 수정 없이 오간다.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from core.logging import setup_logging

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── 실행 모드 ──────────────────────────────────────────────
    DEMO_MODE: bool = True            # True면 외부 API 대신 캐시/스텁 사용
    LOG_LEVEL: str = "INFO"

    # ── 스케줄러 (시나리오 1) ─────────────────────────────────
    SCHEDULER_ENABLED: bool = False   # 기본 꺼둠(토큰 절약). 데모 땐 POST /api/curate로 1회 수동 실행
    SCHEDULER_DEMO_SECONDS: int = 60  # SCHEDULER_ENABLED=true일 때 자동 큐레이션 발사 간격(초)

    # ── DB ────────────────────────────────────────────────────
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'donjebwa.db'}"

    # ── CORS (프론트) ─────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── A2A 에이전트 URL (로컬 기본값, 도커에선 .env로 교체) ──
    PLACE_AGENT_URL: str = "http://localhost:8001"
    ROUTE_AGENT_URL: str = "http://localhost:8002"
    STORYTELLER_AGENT_URL: str = "http://localhost:8003"

    # ── 데이터 경로 ───────────────────────────────────────────
    REGION_POOL_PATH: str = str(BASE_DIR / "data" / "region_pool.json")
    PLACE_CACHE_DIR: str = str(BASE_DIR / "data" / "place_cache")

    # ── 노션 (토큰 + 기존 DB; OAuth 아님) ─────────────────────
    NOTION_TOKEN: str = ""
    NOTION_DB_ID: str = ""

    # ── LLM (스토리텔러용 Gemini) ─────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"   # 프리뷰(-preview) 아님 — GA 버전

    # ── 외부 API 키 (DEMO_MODE=False일 때만 필요) ─────────────
    KAKAO_REST_KEY: str = ""
    TOUR_API_KEY: str = ""
    SEOUL_API_KEY: str = ""


settings = Settings()
setup_logging(settings.LOG_LEVEL)
