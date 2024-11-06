from fastapi import APIRouter, status, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
import asyncio

from admyral.server.auth import authenticate
from admyral.models import AuthenticatedUser, UserProfile
from admyral.server.deps import get_admyral_store
from admyral.agents.audit.chunking import embed_policies
from admyral.agents.audit.agents import (
    AuditExecutor,
    CommonCriterion,
    CommonCriterionPointOfFocus,
    AuditAgentResult,
)
from admyral.logger import get_logger
from admyral.agents.audit.models import (
    PolicyMetadata,
    Policy,
    PolicyChunk,
    AuditResultStatus,
    AuditPointOfFocusResult,
    AuditResult,
    AuditAnalyzedPolicy,
)


logger = get_logger(__name__)
router = APIRouter()


POLICIES = {
    "access_control_policy": PolicyMetadata(
        id="access_control_policy",
        name="Access Control Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "asset_management_policy": PolicyMetadata(
        id="asset_management_policy",
        name="Asset Management Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "business_continuity_and_disaster_recovery_policy": PolicyMetadata(
        id="business_continuity_and_disaster_recovery_policy",
        name="Business Continuity and Disaster Recovery Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "cryptography_policy": PolicyMetadata(
        id="cryptography_policy",
        name="Cryptography Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "data_management_policy": PolicyMetadata(
        id="data_management_policy",
        name="Data Management Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "human_resources_security_policy": PolicyMetadata(
        id="human_resources_security_policy",
        name="Human Resources Security Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "incident_response_plan": PolicyMetadata(
        id="incident_response_plan",
        name="Incident Response Plan",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "information_security_policy_and_acceptable_use_policy": PolicyMetadata(
        id="information_security_policy_and_acceptable_use_policy",
        name="Information Security Policy and Acceptable Use Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "information_security_roles_and_responsibilities": PolicyMetadata(
        id="information_security_roles_and_responsibilities",
        name="Information Security Roles and Responsibilities",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "operations_security_policy": PolicyMetadata(
        id="operations_security_policy",
        name="Operations Security Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "risk_management_policy": PolicyMetadata(
        id="risk_management_policy",
        name="Risk Management Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "secure_development_policy": PolicyMetadata(
        id="secure_development_policy",
        name="Secure Development Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "security": PolicyMetadata(
        id="security",
        name="Security",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
    "thirdparty_risk_management_policy": PolicyMetadata(
        id="thirdparty_risk_management_policy",
        name="Third Party Risk Management Policy",
        approved_on=datetime(2024, 11, 5, 12, 0, 0),
        last_updated=datetime(2024, 11, 5, 12, 0, 0),
        version="1.0.0",
        owner="default.user@admyral.ai",
    ),
}


@router.get("", status_code=status.HTTP_200_OK)
async def list_policies(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[PolicyMetadata]:
    policies = list(POLICIES.values())
    return sorted(policies, key=lambda x: x.name)


@router.get("/id/{policy_id}", status_code=status.HTTP_200_OK)
async def get_policy(
    policy_id: str,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> Policy:
    if policy_id not in POLICIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found."
        )

    with open(f"data/policies/flowfuse/{policy_id}.md", "r") as f:
        policy_content = f.read()

    return Policy.model_validate(
        {
            **POLICIES[policy_id].model_dump(),
            "content": policy_content,
        }
    )


AUDIT_RESULTS = [
    AuditResult(
        id="CC6.1",
        name="Implementation of Logical Access Security Controls and Architecture for Protected Information Assets",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity implements logical access security software, infrastructure, and architectures over "
        "protected information assets to protect them from security events to meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Identifies and Manages the Inventory of Information Assets",
                description="The entity identifies, inventories, classifies, and manages information assets.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Restricts Logical Access",
                description="Logical access to information assets, including hardware, data (at-rest, during processing, or in transmission), "
                "software, administrative authorities, mobile devices, output, and offline system components is restricted through "
                "the use of access control software and rule sets.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Considers Network Segmentation",
                description="Network segmentation permits unrelated portions of the entity's information system to be isolated from each other.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Manages Points of Access",
                description="Points of access by outside entities and the types of data that flow through the points of access are identified, "
                "inventoried, and managed. The types of individuals and systems using each point of access are identified, "
                "documented, and managed.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Restricts Access to Information Assets",
                description="Combinations of data classification, separate data structures, port restrictions, access protocol restrictions, "
                "user identification, and digital certificates are used to establish access-control rules for information assets.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Manages Identification and Authentication",
                description="Identification and authentication requirements are established, documented, and managed for individuals and systems "
                "accessing entity information, infrastructure, and software.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Manages Credentials for Infrastructure and Software",
                description="New internal and external infrastructure and software are registered, authorized, and documented prior to being "
                "granted access credentials and implemented on the network or access point. Credentials are removed and access is "
                "disabled when access is no longer required or the infrastructure and software are no longer in use.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Uses Encryption to Protect Data",
                description="The entity uses encryption to supplement other measures used to protect data at rest, when such protections "
                "are deemed appropriate based on assessed risk.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Protects Encryption Keys",
                description="Processes are in place to protect encryption keys during generation, storage, use, and destruction.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.2",
        name="Implements Registration, Authorization, and Deprovisioning of System Credentials for User Access Management",
        status=AuditResultStatus.NOT_AUDITED,
        description="Prior to issuing system credentials and granting system access, the entity registers and authorizes "
            "new internal and external users whose access is administered by the entity. For those users whose "
            "access is administered by the entity, user system credentials are removed when user access is no "
            "longer authorized.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Controls Access Credentials to Protected Assets",
                description="Information asset access credentials are created based on an authorization from the system's "
                "asset owner or authorized custodian.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Removes Access to Protected Assets When Appropriate",
                description="Processes are in place to remove credential access when an individual no longer requires such access.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Reviews Appropriateness of Access Credentials",
                description="The appropriateness of access credentials is reviewed on a periodic basis for unnecessary and "
                "inappropriate individuals with credentials.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.3",
        name="Implements Role-Based Access Controls with Least Privilege and Segregation of Duties",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity authorizes, modifies, or removes access to data, software, functions, and other protected information "
            "assets based on roles, responsibilities, or the system design and changes, giving consideration to the concepts "
            "of least privilege and segregation of duties, to meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Creates or Modifies Access to Protected Information Assets",
                description="Processes are in place to create or modify access to protected information assets based on authorization "
                    "from the asset's owner.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Removes Access to Protected Information Assets",
                description="Processes are in place to remove access to protected information assets when an individual no longer requires access.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Uses Role-Based Access Controls",
                description="Role-based access control is utilized to support segregation of incompatible functions.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Reviews Access Roles and Rules",
                description="The appropriateness of access roles and access rules is reviewed on a periodic basis for unnecessary and "
                    "inappropriate individuals with access and access rules are modified as appropriate.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.4",
        name="Implements Physical Access Controls for Facilities and Protected Information Assets",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity restricts physical access to facilities and protected information assets (for example, data center facilities, "
            "backup media storage, and other sensitive locations) to authorized personnel to meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Creates or Modifies Physical Access",
                description="Processes are in place to create or modify physical access to facilities such as data centers, office spaces, and "
                    "work areas, based on authorization from the system's asset owner.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Removes Physical Access",
                description="Processes are in place to remove access to physical resources when an individual no longer requires access.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Reviews Physical Access",
                description="Processes are in place to periodically review physical access to ensure consistency with job responsibilities.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.5",
        name="Implements Secure Data and Software Disposal for Decommissioned Physical Assets",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity discontinues logical and physical protections over physical assets only after the ability to read or recover "
            "data and software from those assets has been diminished and is no longer required to meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Identifies Data and Software for Disposal",
                description="Procedures are in place to identify data and software stored on equipment to be disposed and to render such data "
                    "and software unreadable.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Removes Data and Software From Entity Control",
                description="Procedures are in place to remove data and software stored on equipment to be removed from the physical control of "
                "the entity and to render such data and software unreadable.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.6",
        name="Implements External Access Security Controls and Boundary Protection Systems",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity implements logical access security measures to protect against threats from sources outside its system boundaries.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Restricts Access",
                description="The types of activities that can occur through a communication channel (for example, FTP site, router port) are restricted.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Protects Identification and Authentication Credentials",
                description="Identification and authentication credentials are protected during transmission outside its system boundaries.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Requires Additional Authentication or Credentials",
                description="Additional authentication information or credentials are required when accessing the system from outside its boundaries.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Implements Boundary Protection Systems",
                description="Boundary protection systems (for example, firewalls, demilitarized zones, and intrusion detection systems) are implemented "
                    "to protect external access points from attempts and unauthorized access and are monitored to detect such attempts.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.7",
        name="Implements Data Protection Controls for Information Transmission, Movement, and Removal",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity restricts the transmission, movement, and removal of information to authorized internal and "
            "external users and processes, and protects it during transmission, movement, or removal to meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Restricts the Ability to Perform Transmission",
                description="Data loss prevention processes and technologies are used to restrict ability to authorize and execute "
                    "transmission, movement, and removal of information.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Uses Encryption Technologies or Secure Communication Channels to Protect Data",
                description="Encryption technologies or secured communication channels are used to protect transmission of data and "
                "other communications beyond connectivity access points.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Protects Removal Media",
                description="Encryption technologies and physical asset protections are used for removable media (such as USB drives "
                    "and backup tapes), as appropriate.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Protects Mobile Devices",
                description="Processes are in place to protect mobile devices (such as laptops, smart phones, and tablets) that serve as "
                "information assets.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
    AuditResult(
        id="CC6.8",
        name="Implements Controls for Prevention and Detection of Unauthorized Software",
        status=AuditResultStatus.NOT_AUDITED,
        description="The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software to "
            "meet the entity's objectives.",
        category="Logical and Physical Access Controls",
        last_audit=None,
        gap_analysis="",
        recommendation="",
        point_of_focus_results=[
            AuditPointOfFocusResult(
                name="Restricts Application and Software Installation",
                description="The ability to install applications and software is restricted to authorized individuals.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Detects Unauthorized Changes to Software and Configuration Parameters",
                description="Processes are in place to detect changes to software and configuration parameters that may be indicative of unauthorized or "
                "malicious software.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Uses a Defined Change Control Process",
                description="A management-defined change control process is used for the implementation of software.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Uses Antivirus and Anti-Malware Software",
                description="Antivirus and anti-malware software is used to detect and remove unauthorized or malicious software.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
            AuditPointOfFocusResult(
                name="Scans Information Assets from Outside the Entity for Malware and Other Unauthorized Software",
                description="Procedures are in place to scan information assets that have been transferred or returned to the entity's custody for malware and other "
                "unauthorized software and to remove any items detected prior to its implementation on the network.",
                status=AuditResultStatus.NOT_AUDITED,
                gap_analysis="",
                recommendation="",
            ),
        ],
        analyzed_policies=[],
    ),
]


async def run_audit_agent():
    logger.info("Running audit agent...")

    logger.info("Embedding policies...")
    policies = []
    for policy in POLICIES.values():
        with open(f"data/policies/flowfuse/{policy.id}.md", "r") as f:
            policy_content = f.read()

        policies.append(
            Policy.model_validate(
                {
                    **policy.model_dump(),
                    "content": policy_content,
                }
            )
        )

    logger.info("Embedding policies...")
    vector_store = await embed_policies(
        collection_name="policies", policies=policies, location=":memory:"
    )

    executor = await AuditExecutor.build(vector_store=vector_store, policies=policies)
    executor.start()
    for idx in range(len(AUDIT_RESULTS)):
        cc = CommonCriterion(
            id=AUDIT_RESULTS[idx].id,
            name=AUDIT_RESULTS[idx].name,
            description=AUDIT_RESULTS[idx].description,
            category=AUDIT_RESULTS[idx].category,
            points_of_focus=[
                CommonCriterionPointOfFocus(
                    name=point_of_focus.name,
                    description=point_of_focus.description,
                )
                for point_of_focus in AUDIT_RESULTS[idx].point_of_focus_results
            ],
        )
        try:
            result = await executor.execute(cc)
        except Exception as e:
            logger.error(f"Error executing audit for {cc.id}: {e}")
            AUDIT_RESULTS[idx].last_audit = datetime.utcnow()
            AUDIT_RESULTS[idx].status = AuditResultStatus.ERROR
            continue

        # update audit results
        AUDIT_RESULTS[idx].last_audit = datetime.utcnow()
        AUDIT_RESULTS[idx].status = (
            AuditResultStatus.PASSED
            if result.audit_result.passed
            else AuditResultStatus.FAILED
        )
        AUDIT_RESULTS[idx].gap_analysis = result.audit_result.gap_analysis
        AUDIT_RESULTS[idx].recommendation = result.audit_result.recommendation

        used_policies = set()

        for idx2 in range(len(AUDIT_RESULTS[idx].point_of_focus_results)):
            AUDIT_RESULTS[idx].point_of_focus_results[idx2].status = (
                AuditResultStatus.PASSED
                if result.point_of_focus_audit_results[idx2].passed
                else AuditResultStatus.FAILED
            )
            AUDIT_RESULTS[idx].point_of_focus_results[
                idx2
            ].gap_analysis = result.point_of_focus_audit_results[idx2].gap_analysis
            AUDIT_RESULTS[idx].point_of_focus_results[
                idx2
            ].recommendation = result.point_of_focus_audit_results[idx2].recommendation

            used_policies.update(
                result.point_of_focus_audit_results[idx2].used_policies
            )

        AUDIT_RESULTS[idx].analyzed_policies = list(
            AuditAnalyzedPolicy(id=policy_id, name=POLICIES[policy_id].name)
            for policy_id in used_policies
        )

    await executor.stop()

    logger.info("Audit agent finished.")


@router.post("/audit/start", status_code=status.HTTP_201_CREATED)
async def start_audit_policies(
    background_tasks: BackgroundTasks,
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> None:
    for idx in range(len(AUDIT_RESULTS)):
        AUDIT_RESULTS[idx].status = AuditResultStatus.IN_PROGRESS

    background_tasks.add_task(run_audit_agent)


@router.get("/audit/results", status_code=status.HTTP_200_OK)
async def get_audit_results(
    authenticated_user: AuthenticatedUser = Depends(authenticate),
) -> list[AuditResult]:
    return AUDIT_RESULTS
