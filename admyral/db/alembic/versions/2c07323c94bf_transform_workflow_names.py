"""transform workflow names

Revision ID: 2c07323c94bf
Revises: 552e7a8dec07
Create Date: 2024-11-02 14:33:05.196806

"""

from typing import Sequence, Union

from alembic import op
import sqlmodel  # noqa F401


# revision identifiers, used by Alembic.
revision: str = "2c07323c94bf"
down_revision: Union[str, None] = "552e7a8dec07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_unique_constraint(
        "uq_Account_provider_providerAccountId",
        "Account",
        ["provider", "providerAccountId"],
    )
    op.create_unique_constraint(
        "uq_VerificationToken_identifier_token",
        "VerificationToken",
        ["identifier", "token"],
    )

    # transform workflow names from snake_case to Title Case
    op.execute("""
    UPDATE workflows
    SET 
        workflow_name = (
            SELECT string_agg(
                INITCAP(part),
                ' '
            )
            FROM unnest(string_to_array(workflow_name, '_')) part
        ),
        workflow_dag = jsonb_set(
            workflow_dag::jsonb,
            '{name}',
            to_jsonb(
                (
                    SELECT string_agg(
                        INITCAP(part),
                        ' '
                    )
                    FROM unnest(string_to_array(workflow_name, '_')) part
                )
            )
        )
    WHERE workflow_name LIKE '%_%';
    """)

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # transform workflow names to snake_case
    op.execute("""
    UPDATE workflows
    SET
        workflow_name = (
            SELECT string_agg(
                LOWER(part),
                '_'
            )
            FROM unnest(string_to_array(workflow_name, ' ')) part
        ),
        workflow_dag = jsonb_set(
            workflow_dag::jsonb,
            '{name}',
            to_jsonb(
                (
                    SELECT string_agg(
                        LOWER(part),
                        '_'
                    )
                    FROM unnest(string_to_array(workflow_name, ' ')) part
                )
            )
        )
    WHERE workflow_name LIKE '% %';
    """)

    op.drop_constraint(
        "uq_VerificationToken_identifier_token", "VerificationToken", type_="unique"
    )
    op.drop_constraint(
        "uq_Account_provider_providerAccountId", "Account", type_="unique"
    )
    # ### end Alembic commands ###