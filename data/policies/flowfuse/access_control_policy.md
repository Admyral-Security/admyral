# Access Control Policy

Policy owner: @knolleary
Effective date: 2023-05-01

## Purpose

To limit access to information and systems to authorized parties in accordance with business objectives.

## Scope

This policy applies to all FlowFuse information systems that process, store, or transmit confidential data as defined in the FlowFuse Data Management Policy.

It applies to all employees of FlowFuse and to all external parties with access to FlowFuse system resources.

## Access Control Policy

1. Access to all computing resources, including servers, end-user computing devices, network equipment, services and applications, must be protected by strong authentication, authorization, and auditing.

2. Interactive user access must be associated to an account or login unique to each user.

3. All credentials, including user passwords, service accounts, and access keys, must meet the length, complexity, age, and rotation requirements defined by industry best practice. Specific requires are described in the password policy.

4. Use strong password and multi-factor authentication (MFA) whenever possible to authenticate to all computing resources.

5. MFA is required to access any critical system or resource, including but not limited to resources in production environments.

6. Unused accounts, passwords, access keys must be removed within 30 days.

7. A unique access key or service account must be used for different application or user access.

8. Authenticated sessions must time out after a defined period of inactivity.

### How to Request Access or Permission to a System

If you require access or permissions (e.g., for AWS, GitHub, HubSpot), please raise a Ticket/Issue in our admin repository.

### Access Authorization and Termination

1. Access authorization shall be implemented using role-based access control (RBAC) or similar mechanism.

2. Standard access based on a user's job role may be pre-provisioned during employee onboarding. All subsequent access requests to computing resources must be approved by the requestor’s manager, prior to granting and provisioning of access.

3. Access to critical resources, such as production environments, must be approved by the CTO in addition to the requestor’s manager.

4. Access must be reviewed on a regular basis and revoked if no longer needed.

5. Upon termination of employment, all system access must be revoked and user accounts terminated within 24 hours or one business day.

6. All system access must be reviewed at least annually and whenever a user's job role changes.

### Shared Secrets Management

1. Use of shared credentials/secrets must be minimized and approved on an exception basis.

2. If required by business operations, secrets/credentials must be shared securely and stored in the company provided password manager, 1Password.

3. Usage of a shared secret to access a critical system or resource must be supported by a complimenting solution to uniquely identify the user.

## Privileged Access Management

1. Users must not log in directly to systems as a privileged user.

   - A privileged user is someone who has administrative access to critical systems, such as a Active Directory Domain Administrator, root user to a Linux/Unix system, and Administrator or Root User to an AWS account.

2. Privilege access must only be gained through a proxy, or equivalent, that supports strong authentication (such as MFA) using a unique individual account with full auditing of user activities.

3. Direct administrative access to production systems must be kept to an absolute minimum.

## Access to Source Code

FlowFuse defaults to developing in the open, without restriction on who can view the source code.

Exceptions will be made for business reasons to keep particular repositories private. Access to private repositories on GitHub will be based on business need and role.

## Password Policy

All FlowFuse system passwords must meet industry standards and best practices. Where possible, systems shall be configured to enforce these standards.

- Minimum length of 8 characters, with a mix of letters, numbers, symbols and case.
- Passwords must not be reused between systems
- Passwords may only be stored in the company provided password vault, 1Password.
