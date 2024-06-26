"""add action_input_template table

Revision ID: b678a86afb6c
Revises: b1ef28c0bf5d
Create Date: 2024-05-02 18:59:26.300702

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b678a86afb6c'
down_revision = 'b1ef28c0bf5d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('action_input_template',
    sa.Column('action_input_template_id', sa.UUID(as_uuid=False), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('template_name', sa.TEXT(), nullable=False),
    sa.Column('template', sa.TEXT(), nullable=False),
    sa.Column('action_id', sa.UUID(as_uuid=False), nullable=False),
    sa.ForeignKeyConstraint(['action_id'], ['admyral.action_node.action_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('action_input_template_id'),
    schema='admyral'
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('action_input_template', schema='admyral')
    # ### end Alembic commands ###
