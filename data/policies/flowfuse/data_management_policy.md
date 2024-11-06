# Data Management Policy

Policy owner: @ZJvandeWeg
Effective date: 2023-05-01

## Purpose

To ensure that information is classified, protected, retained and securely disposed of in accordance with its importance to the organization.

## Scope

All FlowFuse data, information and information systems.

## Data Management Policy

FlowFuse classifies data and information systems in accordance with legal requirements, sensitivity, and business criticality in order to ensure that information is given the appropriate level of protection. Data owners are responsible for identifying any additional requirements for specific data or exceptions to standard handling requirements.

Information systems and applications shall be classified according to the highest classification of data that they store or process.

## Data Classification

To help FlowFuse and its employees easily understand requirements associated with different kinds of information, the company has created four classes of data.

- Critical
- Confidential
- Internal
- Public

As FlowFuse is an open company by default, most of our data falls into public. But it is important to recognise when a higher classification is required.

## Definitions and Examples

Critical data includes data that must be protected due to regulatory requirements, privacy, and/or security sensitivities.

Unauthorized disclosure of critical data may result in major disruption to business operations, significant cost, irreparable reputation damage, and/or legal prosecution of the company.

External disclosure of critical data is strictly prohibited without an approved process and agreement in place.

Example Critical Data Types include

- PII (personally identifiable information, including a user's full name, address, government ID number, email address, phone number, IP address, biometric information, or other information that can uniquely identify a person)
- Production security data, such as - Production secrets, passwords, access keys, certificates, etc. - Production security audit logs, events, and incident data

Confidential data includes data that contains significant value to the company.

Unauthorized disclosure may result in disruption to business operations and loss of value.

Disclosure requires the signing of NDA and management approval.

Example Confidential Data Types include

- Business plans
- Employee/HR data
- Any news or public announcement - prior to publication
- Non-production security data
- Incident reports - prior to publication

Internal data contains information used for day-to-day interal operations of the company.

Unauthorized disclosure may cause undesirable outcomes to business operations.

Disclosure requires management approval. NDA is usually required but may be waived on a case-by-case basis.

Example Internal Data Types include

- Slack messages
- Meeting minutes, unless classified otherwise
- Email
- Legal documents

Public data is data intended for public consumption and can be freely distributed outside of FlowFuse.

Example Public Data Types include

- FlowFuse source code, unless classified otherwise
- Marketing material
- Product documentation
- The company handbook

## Data Handling Requirements

### Critical

- Encrypted at rest
- Not stored outside of protected systems - eg secure password vault
- Backups encrypted and secured
- Retained for as long as operationally, contractually or legally required
- Only accessible to privileged users
- Never transfered to entites outside of the company

### Confidential

- Encrypted at rest
- Backups encrypted and secured
- No anonymous access
- Access based on 'need-to-know'
- Transfer to entities outside of the company only done via legal contract or arrangement with the explicit permission of management and/or the data owner

### Internal

- Access restricted to company employees or approved contractors
- No unauthenticated access
- Transfer to entities outside of the company only done via legal contract or arrangement with the explicit permission of management and/or the data owner

### Public

- No special data handling required - other than due diligence that higher classified data is not accidentally included in public data. For example, access tokens in source code.

## Data Retention

FlowFuse shall retain data as long as the company has a need for its use, or to meet regulatory or contractual requirements. Once data is no longer needed, it shall be securely disposed of or archived. Data owners, in consultation with legal counsel, may determine retention periods for their data.

Personally identifiable information (PII) shall be deleted or de-identified as soon as it no longer has a business use.

## Data Disposal

Data classified as critical, confidential or internal shall be securely deleted when no longer needed.

FlowFuse will ensure any third-party system used in the operations of the company will meet the requires for secure data disposal.

Personally identifiable information (PII) shall be collected, used and retained only for as long as the company has a legitimate business purpose. PII shall be securely deleted and disposed of following contract termination in accordance with company policy, contractual commitments and all relevant laws and regulations. PII shall also be deleted in response to a verified request from a consumer or data subject, where the company does not have a legitimate business interest or other legal obligation to retain the data.

## Legal Requirements

Under certain circumstances, FlowFuse may become subject to legal proceedings requiring retention of data associated with legal holds, lawsuits, or other matters as stipulated by FlowFuse legal counsel. Such records and information are exempt from any other requirements specified within this Data Management Policy and are to be retained in accordance with requirements identified by the Legal department. All such holds and special retention requirements are subject to annual review with FlowFuse's legal counsel to evaluate continuing requirements and scope.

## Exceptions

Requests for an exception to this policy must be submitted to the CEO or CTO for approval.

## Violations & Enforcement

Any known violations of this policy should be reported to the CEO or CTO. Violations of this policy can result in immediate withdrawal or suspension of system access and/or disciplinary action in accordance with company procedures up to and including termination of employment.
