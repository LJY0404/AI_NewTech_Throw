"""
스케줄러 (backend/scheduler/jobs.py)

시나리오 1 — 무인 자동 큐레이션의 '시간 트리거'.
main.py lifespan이 start_scheduler / shutdown_scheduler를 호출한다.

- DEMO_MODE: SCHEDULER_DEMO_SECONDS 간격으로 발사 (발표장에서 시간 트리거 시연용)
- 운영:      매주 금요일 18:00 발사
둘 다 orchestrator.run("auto")로 들어가 같은 파이프라인을 탄다.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from core.config import settings
from orchestrator.orchestrator import run as run_orchestrator

logger = logging.getLogger("donjebwa.scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _auto_curation_job() -> None:
    """시간 트리거로 호출되는 무인 큐레이션 작업."""
    logger.info("⏰ 자동 큐레이션 트리거 발사")
    try:
        card = await run_orchestrator(mode="auto")
        logger.info("자동 큐레이션 완료: %s (%d곳)", card.region, len(card.stops))
    except Exception as exc:
        # 에이전트 미기동·네트워크 오류 등으로 실패해도 앱은 계속 돈다
        logger.warning("자동 큐레이션 실패(무시하고 계속): %s", exc)


def start_scheduler() -> None:
    global _scheduler
    if not settings.SCHEDULER_ENABLED:
        logger.info("스케줄러 비활성화 — 자동 큐레이션 생략")
        return

    _scheduler = AsyncIOScheduler()

    if settings.DEMO_MODE:
        trigger = IntervalTrigger(seconds=settings.SCHEDULER_DEMO_SECONDS)
        logger.info("데모 스케줄: %d초마다 자동 큐레이션", settings.SCHEDULER_DEMO_SECONDS)
    else:
        trigger = CronTrigger(day_of_week="fri", hour=18, minute=0)
        logger.info("운영 스케줄: 매주 금요일 18:00 자동 큐레이션")

    _scheduler.add_job(
        _auto_curation_job, trigger, id="auto_curation", replace_existing=True
    )
    _scheduler.start()


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("스케줄러 정리 완료")
