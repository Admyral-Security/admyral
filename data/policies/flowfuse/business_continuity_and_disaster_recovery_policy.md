# Business Continuity and Disaster Recovery Policy

Policy owner: @knolleary
Effective date: 2023-07-01

## Purpose

The purpose of this business continuity plan is to prepare FlowFuse in the event of service outages caused by factors beyond our control (e.g., natural disasters, man-made events), and to restore services to the widest extent possible in a minimum time frame.

## Scope

This policy applies to the FlowFuse Cloud production environment, and any individual instances of the platform FlowFuse manages on behalf of customers.

It also applies to any systems used in support of the business critical operations of the company.

## Continuity of Critical Services

As an all-remote company, our business-critical systems are provided by third-party vendors and we rely on their SLAs in the event of any outage.

## FlowFuse Platform General Disaster Recovery Procedures

In the event of a situation that has material impact to the FlowFuse Cloud platform, or any equivalent system managed by FlowFuse on behalf of our customers, the following procedures apply.

### Notification Phase

This phase deals with the initial identification of a situation that impacts a production system. The procedure is as follows:

1. An incident is identified. Full details are relayed to the CTO.
2. The CTO announces an incident in Slack and directs the engineering/devops teams to gather information and assess the impact and estimated recovery time.
3. If the incident will result in a prolonged outage or otherwise, the CTO will activate the Recovery phase.
4. The CTO will notify the necessary teams of this decision, including the CEO.

### Recovery Phase

The goal is to fully restore the affected system within 24 hours of the outage and to minimise further disruption for the affected users.

The following steps should be taken. The CTO will coordinate these actions with the required teams.

1. Notify affected users to begin initial communication
2. Assess damage to the environment
3. Create a new production environment
4. Ensure new environment is properly secured
5. Deploy platform code to new environment
6. Restore data backup to new environment
7. Verify platform deployment
8. Verify logging, monitoring and alerting functionality
9. Update DNS and other necessary records to point to the new environment
10. Notify affected users through established channels

### Resolution Phase

Once the system has been restored, the CTO will initiate a post mortem of the event to ensure any lessons from the outage and subsequent recovery can be reviewed and captured.
