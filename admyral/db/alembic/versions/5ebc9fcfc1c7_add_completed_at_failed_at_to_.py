"""add completed_at/failed_at to WorkflowRun and error to WorkflowRunStep

Revision ID: 5ebc9fcfc1c7
Revises: 014da66fd11f
Create Date: 2024-09-05 19:49:37.980623

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa F401


# revision identifiers, used by Alembic.
revision: str = "5ebc9fcfc1c7"
down_revision: Union[str, None] = "014da66fd11f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("workflow_run_steps", sa.Column("error", sa.TEXT(), nullable=True))
    op.add_column(
        "workflow_runs", sa.Column("completed_at", sa.TIMESTAMP(), nullable=True)
    )
    op.add_column(
        "workflow_runs", sa.Column("failed_at", sa.TIMESTAMP(), nullable=True)
    )

    # By default we mark all previous runs as successfully completed.
    op.execute("UPDATE workflow_runs SET completed_at = created_at")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("workflow_runs", "failed_at")
    op.drop_column("workflow_runs", "completed_at")
    op.drop_column("workflow_run_steps", "error")
    # ### end Alembic commands ###
