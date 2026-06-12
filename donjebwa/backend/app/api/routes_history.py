"""
히스토리 라우터 (backend/app/api/routes_history.py)

GET /api/history — 지금까지 던진 결과 목록(최신순).
프론트의 "최근 던진 결과" 화면과 데모 시 누적 결과 확인에 쓴다.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from core import models

router = APIRouter()


@router.get("/history")
async def history(limit: int = 20, db: Session = Depends(get_db)) -> list[dict]:
    """최근 던진 결과를 최신순으로 반환한다."""
    stmt = (
        select(models.ThrowRecord)
        .order_by(models.ThrowRecord.created_at.desc())
        .limit(limit)
    )
    records = db.execute(stmt).scalars().all()
    return [
        {
            "id": r.id,
            "mode": r.mode,
            "region": r.region,
            "companion": r.companion,
            "story": r.story,
            "notion_url": r.notion_url,
            "created_at": r.created_at,
        }
        for r in records
    ]
