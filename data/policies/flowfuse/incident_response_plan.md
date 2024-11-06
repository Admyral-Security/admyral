# Incident Response Plan

Policy owner: @knolleary
Effective date: 2023-07-01

## Purpose

This document establishes the plan for managing information security incidents and events, and offers guidance for employees or incident responders who believe they have discovered, or are responding to, a security incident.

## Scope

This policy covers all information security or data privacy events or incidents.

## External Vulnerability Disclosures

This policy relates to how we deal with security issues internally. For information on how to report potential vulnerabilities in the FlowFuse platform and associated components from outside the company, please refer to our Vulnerability Reporting policy.

## Incident and Event Definitions

A security event is an observable occurrence relevant to the confidentiality, availability, integrity, or privacy of company controlled data, systems or networks.

A security incident is a security event which results in loss or damage to the confidentiality, availability, integrity, or privacy of company controlled data, systems or networks.

## Security Incident Response Team

The Security Incident Response Team (SIRT) is responsible for

- Reviewing analyzing, and logging all received reports and tracking their statuses.
- Performing investigations, creating and executing action plans, and post-incident activities.
- Collaboration with law enforcement agencies.

Current members of the FlowFuse SIRT:

- CTO
- CEO
- Customer Success manager
- Product Manager

## Incident Reporting & Documentation

### Reporting

If a FlowFuse employee, contractor, user, or customer becomes aware of an information security event or incident, possible incident, imminent incident, unauthorized access, policy violation, security weakness, or suspicious activity, then they shall immediately report the information using one of the following communication channels:

- Email security@flowfuse.com with information or reports about the event or incident
- Raise an issue in flowforge/security
- Report it in #security channel in slack

Reports should include specific details about what has been observed or discovered.

### Severity

The SIRT shall monitor incident and event issues and shall assign a severity (via label) based on the following categories:

- P3/P4 - Low and Medium Severity Issues meeting this severity are simply suspicions or odd behaviors. They are not verified and require further investigation. There is no clear indicator that systems have tangible risk and do not require emergency response. This includes lost/stolen laptop with disk encryption, suspicious emails, outages, strange activity on a laptop, etc.
- P2 - High Severity High severity issues relate to problems where an adversary or active exploitation hasn't been proven yet, and may not have happened, but is likely to happen. This may include lost/stolen laptop without encryption, vulnerabilities with direct risk of exploitation, threats with risk or adversarial persistence on our systems (e.g.: backdoors, malware), malicious access of business data (e.g.: passwords, vulnerability data, payments information).
- P1 - Critical Severity Critical issues relate to actively exploited risks and involve a malicious actor or threats that put any individual at risk of physical harm. Identification of active exploitation is required to meet this severity category.

### Escalation and Internal Reporting

- P1 - Critical Severity P1 issues require immediate notification to a member of the SIRT
- P2 - High Severity An issue should be raised in flowforge/security and explicit notification in the #security channel
- P3/P4 - Medium and Low Severity An issue should be raised in flowforge/security

### Documentation

All reported security events, incidents, and response activities shall be documented and adequately protected in the flowforge/security repository.

A root cause analysis (RCA) may be performed on all verified P1 security incidents. It will be reference in the incident issue and reviewed by the SIRT.

## Incident Response Process

For critical issues, the response team will follow an iterative response process.

This covers the following phases:

1. Investigate - establish the known facts of the situation.
2. Contain - limit the impact of the situation.
3. Eradicate - remove the immediate cause of the situation.
4. Recover - restore the affected systems and services.
5. Remediate - apply necessary preventative measures to ensure the situation cannot happen again.
6. Document - perform a post-mortem of the situation and a root-cause analysis (RCA). Document to ensure lessons can be learnt.

## External Communications and Breach Reporting

In the event of unauthorized access to company or customer systems, networks, and/or data, the CEO, with Legal advice, determine what external communications are required.

Breaches shall be reported to customers, consumers, data subjects and regulators without undue delay and in accordance with all contractual commitments and applicable legislation.

No personnel may disclose information regarding incident or potential breaches to any third party or unauthorized person without the approval of legal and/or executive management.

## Mitigation and Remediation

The CEO and CTO shall determine any immediate or long term mitigations or remedial actions that need to be taken as a result of an incident or breach.

In the event that mitigations or remedial actions are needed, executive staff shall direct personnel with respect to planning, communicating and executing those activities.

## Cooperation with Customers, Data Controller and Authorities

As needed and determined by legal and executive staff, the company shall cooperate with customers, Data Controllers and regulators to fulfill all of its obligations in the event of an incident or data breach.

## Exceptions

Requests for an exception to this policy must be submitted to the CEO or CTO for approval.

## Violations & Enforcement

Any known violations of this policy should be reported to the CEO or CTO. Violations of this policy can result in immediate withdrawal or suspension of system access and/or disciplinary action in accordance with company procedures up to and including termination of employment.
