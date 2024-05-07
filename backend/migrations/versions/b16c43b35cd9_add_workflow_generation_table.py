"""add workflow_generation table

Revision ID: b16c43b35cd9
Revises: b678a86afb6c
Create Date: 2024-05-05 19:18:32.133643

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b16c43b35cd9'
down_revision = 'b678a86afb6c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('workflow_generation',
    sa.Column('generation_id', sa.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('user_id', sa.UUID(as_uuid=False), nullable=True),
    sa.Column('total_tokens', sa.Integer(), nullable=False),
    sa.Column('prompt_tokens', sa.Integer(), nullable=False),
    sa.Column('completion_tokens', sa.Integer(), nullable=False),
    sa.Column('user_input', sa.TEXT(), nullable=False),
    sa.Column('generated_actions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('generated_edges', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['admyral.user_profile.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('generation_id'),
    schema='admyral'
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('workflow_generation', schema='admyral')
    # ### end Alembic commands ###