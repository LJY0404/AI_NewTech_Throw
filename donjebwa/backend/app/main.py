"""
던져봐 — FastAPI 진입점 (backend/app/main.py)

역할
- 프론트(Next.js)가 호출하는 REST/SSE 라우터 등록
- APScheduler 기동 → 시나리오 1 (시간 트리거 완전 자동화)
- CORS 허용

무거운 로직은 전부 다른 모듈에 위임한다. 이 파일은 '배선'만 한다.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.db import init_db
from app.api import routes_throw, routes_stream, routes_history
from scheduler.jobs import start_scheduler, shutdown_scheduler

logger = logging.getLogger("donjebwa")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작: DB 테이블 생성(없으면) → 자동 큐레이션 스케줄러 기동 (시나리오 1)
    init_db()
    logger.info("DB 초기화 완료")
    start_scheduler()
    logger.info("스케줄러 기동 완료")
    yield
    # 종료: 스케줄러 정리 — 데모 후 리소스 해제 필수
    shutdown_scheduler()
    logger.info("스케줄러 종료")


app = FastAPI(
    title="던져봐 API",
    description="A2A 멀티에이전트 여행 코스 추천",
    version="0.1.0",
    lifespan=lifespan,
)

# 프론트(Next.js)에서의 cross-origin 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,   # 예: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 → /api/throw, /api/stream, /api/history
app.include_router(routes_throw.router, prefix="/api", tags=["throw"])
app.include_router(routes_stream.router, prefix="/api", tags=["stream"])
app.include_router(routes_history.router, prefix="/api", tags=["history"])


@app.get("/health")
async def health():
    """헬스체크 — 도커/데모 점검용"""
    return {"status": "ok"}
