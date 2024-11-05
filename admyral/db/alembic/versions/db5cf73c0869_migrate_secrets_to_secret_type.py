"""migrate secrets to secret_type

Revision ID: db5cf73c0869
Revises: 2f91aed0b218
Create Date: 2024-11-04 23:34:16.416482

"""

from typing import Sequence, Union

from alembic import op
import sqlmodel  # noqa F401


# revision identifiers, used by Alembic.
revision: str = "db5cf73c0869"
down_revision: Union[str, None] = "2f91aed0b218"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    bind = op.get_bind()

    integrations = [
        ("anthropic", "Anthropic"),
        ("mistral ai", "Mistral AI"),
        ("openai", "OpenAI"),
        ["Jira", "Jira"],
        ["OpsGenie", "OpsGenie"],
        ["PagerDuty", "PagerDuty"],
        ["Intune", "Azure"],
        ["Defender", "Azure"],
        ["Azure", "Azure"],
        ("azure openai", "Azure OpenAI"),
        ["Wiz", "Wiz"],
        ["turbot", "Database"],
        ["slack", "Slack"],
        ["Github", "GitHub"],
        ["google", "Google"],
        ["drive", "Google"],
        ["kandji", "Kandji"],
        ["1Password", "1Password"],
        ["retool", "Retool"],
        ["zendesk", "Zendesk"],
        ["sentinelone", "SentinelOne"],
        ["abnormal", "Abnormal Security"],
        ["abuseipdb", "AbuseIPDB"],
        ["otx", "AlienVault OTX"],
        ["alienvault", "AlienVault OTX"],
        ["greynoise", "GreyNoise"],
        ["leakcheck", "LeakCheck"],
        ["virus", "VirusTotal"],
        ["okta", "Okta"],
        ["snyk", "Snyk"],
    ]

    for potential_name, secret_type in integrations:
        potential_name: str = potential_name.lower()
        bind.execute(
            sqlmodel.text(
                "UPDATE secrets SET secret_type = :new_type WHERE secret_type LIKE :pattern"
            ),
            {
                "new_type": secret_type,
                "pattern": f"%{potential_name}%",
            },
        )
        potential_name = potential_name.replace(" ", "_")
        bind.execute(
            sqlmodel.text(
                "UPDATE secrets SET secret_type = :new_type WHERE secret_type LIKE :pattern"
            ),
            {
                "new_type": secret_type,
                "pattern": f"%{potential_name}%",
            },
        )

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    # since secret types have no use previously we can just
    # leave them as is
    pass

    # ### end Alembic commands ###
