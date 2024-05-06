from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from datetime import timedelta

from app.models import WorkflowGeneration


async def count_workflow_generations_last_24h(user_id: int, db: AsyncSession) -> int:
    result = await db.exec(
        select(func.count(WorkflowGeneration.generation_id))
            .where(WorkflowGeneration.user_id == user_id)
            .where(WorkflowGeneration.created_at >= func.now() - timedelta(hours=24))
            .limit(1)
    )
    count = result.one_or_none()
    if not count:
        return 0
    return count
