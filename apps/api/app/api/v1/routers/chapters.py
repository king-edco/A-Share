"""GET endpoint for the chapter list of one subject (read-only catalog)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.models.chapter import Chapter
from app.models.subject import Subject
from app.schemas import ChapterRead

router = APIRouter(prefix="/api/v1/subjects", tags=["subjects"])


@router.get("/{subject_id}/chapters", response_model=list[ChapterRead])
async def list_subject_chapters(
    subject_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> list[Chapter]:
    """Return the active chapters of one subject, ordered by order_index.

    Each item carries parent_chapter_id so the client can indent the tree.
    """
    subject = await session.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")

    result = await session.execute(
        select(Chapter)
        .where(Chapter.subject_id == subject_id, Chapter.is_active)
        .order_by(Chapter.order_index, Chapter.title)
    )
    return list(result.scalars().all())
