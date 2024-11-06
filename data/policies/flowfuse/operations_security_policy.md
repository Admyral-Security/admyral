# Operations Security Policy

Policy owner: @knolleary
Effective date: 2023-06-01

## Purpose

To ensure the correct and secure operation of information processing systems and facilities.

## Scope

All FlowFuse data, information and information systems that are business critical and/or process, store, or transmit company data.

## Operations Security

Both technical and administrative operating procedures shall be documented as needed and made available to all users who need them via the handbook.

## Change Management

Changes to the organization, business processes, information processing facilities, production software and infrastructure, and systems that affect information security in the production environment and financial systems shall be tested, reviewed, and approved prior to production deployment.

All significant changes to in-scope systems and networks must be documented.

Change management processes shall include:

- Processes for planning and testing of changes, including remediation measures
- Documented approval and authorization before proceeding with changes that may have a significant impact on information security, operations, or the production platform
- Advance communication/warning of changes, including schedules and a description of reasonably anticipated effects, provided to all relevant internal and external stakeholders
- Documentation of all emergency changes and subsequent review
- A process for remediating unsuccessful changes

## Separation of Development, Staging and Production Environments

Development and staging environments shall be strictly segregated from production SaaS environments to reduce the risks of unauthorized access or changes to the operational environment.

Confidential production customer data must not be used in development or test environments without the express approval of the CTO/CEO.

Refer to the Data Management Policy for a description of Confidential data. If production customer data is approved for use in the course of development or testing, it shall be scrubbed of any such sensitive information whenever feasible.

## Information Backup

The need for backups of systems, databases, information and data shall be considered and appropriate backup processes shall be designed, planned and implemented.

Backup procedures must include procedures for maintaining and recovering customer data in accordance with documented SLAs. Security measures to protect backups shall be designed and applied in accordance with the confidentiality or sensitivity of the data.

Backup copies of information, software and system images shall be taken regularly to protect against loss of data. Backups and restore capabilities shall be periodically tested, not less than annually.

Backups must be stored separately from the production data location.

FlowFuse does not regularly backup user devices like laptops. Users are expected to store critical files and information in the commpany-provided Google Drive with appropriate access controls applied.

## Logging & Monitoring

Production infrastructure shall be configured to produce detailed logs appropriate to the function served by the system or device. Event logs recording user activities, exceptions, faults and information security events shall be produced, kept and reviewed through manual or automated processes as needed.

Appropriate alerts shall be configured for events that represent a significant threat to the confidentiality, availability or integrity of production systems or Confidential data.

## Exceptions

Requests for an exception to this policy must be submitted to the CEO or CTO for approval.

## Violations & Enforcement

Any known violations of this policy should be reported to the CEO or CTO. Violations of this policy can result in immediate withdrawal or suspension of system access and/or disciplinary action in accordance with company procedures up to and including termination of employment.
