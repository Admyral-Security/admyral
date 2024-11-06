from pydantic import BaseModel
from enum import Enum
from datetime import datetime


class PolicyMetadata(BaseModel):
    id: str
    name: str
    approved_on: datetime
    last_updated: datetime
    version: str
    owner: str


class Policy(BaseModel):
    id: str
    name: str
    approved_on: datetime
    last_updated: datetime
    version: str
    owner: str
    content: str


class PolicyChunk(BaseModel):
    policy_id: str
    name: str
    chunk: str


class AuditResultStatus(str, Enum):
    NOT_AUDITED = "Not Audited"
    FAILED = "Failed"
    PASSED = "Passed"
    IN_PROGRESS = "In Progress"
    ERROR = "Error"


class AuditAnalyzedPolicy(BaseModel):
    id: str
    name: str


class AuditPointOfFocusResult(BaseModel):
    name: str
    description: str
    status: AuditResultStatus
    gap_analysis: str
    recommendation: str


class AuditResult(BaseModel):
    id: str
    name: str
    status: AuditResultStatus
    description: str
    category: str
    last_audit: datetime | None
    gap_analysis: str
    recommendation: str
    point_of_focus_results: list[AuditPointOfFocusResult]
    analyzed_policies: list[AuditAnalyzedPolicy]
