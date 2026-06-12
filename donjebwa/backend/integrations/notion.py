"""
노션 연동 (backend/integrations/notion.py)

OAuth 안 쓴다. 인테그레이션 토큰 + 미리 만들어둔 DB에 페이지만 append.
토큰/DB가 비어 있으면(초기 개발) 스텁 URL을 돌려줘 파이프라인이 안 끊긴다.

스키마 결합을 최소화하려고, 본문(코스·스토리)은 페이지 children 블록으로 넣고
properties는 'title' 하나만 건드린다 — 어떤 DB든 title은 반드시 있으니까.
(별점·후기·날짜 같은 컬럼은 나중에 properties로 확장 가능)
"""
import logging

from notion_client import AsyncClient

from app.schemas.throw import CourseCard
from core.config import settings

logger = logging.getLogger("donjebwa.notion")


async def append_course(card: CourseCard) -> str:
    """결과 코스를 노션 DB에 새 페이지로 추가하고 페이지 URL을 반환한다."""
    if not settings.NOTION_TOKEN or not settings.NOTION_DB_ID:
        logger.warning("노션 미설정(NOTION_TOKEN/DB_ID 비어있음) — 스텁 URL 반환")
        return "https://www.notion.so/demo-stub"

    notion = AsyncClient(auth=settings.NOTION_TOKEN)
    title_prop = await _find_title_prop(notion)
    title = f"{card.region} · {card.created_at:%m/%d %H:%M}"

    page = await notion.pages.create(
        parent={"database_id": settings.NOTION_DB_ID},
        properties={title_prop: {"title": [{"text": {"content": title}}]}},
        children=_build_blocks(card),
    )
    url = page.get("url", "")
    logger.info("노션 페이지 생성: %s", url)
    return url


async def _find_title_prop(notion: AsyncClient) -> str:
    """DB에서 type이 'title'인 property 이름을 찾는다(이름이 한글이어도 대응)."""
    db = await notion.databases.retrieve(database_id=settings.NOTION_DB_ID)
    for name, prop in db.get("properties", {}).items():
        if prop.get("type") == "title":
            return name
    return "Name"


def _build_blocks(card: CourseCard) -> list[dict]:
    """페이지 본문: 스토리 문단 + 코스 불릿 리스트."""
    blocks: list[dict] = []

    if card.story:
        blocks.append(_paragraph(card.story))

    blocks.append(_heading("추천 코스"))
    for stop in card.stops:
        line = stop.name
        if stop.category:
            line += f" ({stop.category})"
        if stop.note:
            line += f" — {stop.note}"
        blocks.append(_bullet(line))

    return blocks


def _paragraph(text: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": [{"type": "text", "text": {"content": text[:1900]}}]},
    }


def _heading(text: str) -> dict:
    return {
        "object": "block",
        "type": "heading_3",
        "heading_3": {"rich_text": [{"type": "text", "text": {"content": text[:1900]}}]},
    }


def _bullet(text: str) -> dict:
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": text[:1900]}}]},
    }
