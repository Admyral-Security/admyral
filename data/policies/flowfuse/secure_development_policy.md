# Secure Development Policy

Policy owner: @knolleary
Effective date: 2023-05-01

## Purpose

To ensure that information security is designed and implemented within the development lifecycle for applications and information systems.

## Scope

All FlowFuse applications and information systems that are business critical and/or process, store, or transmit Confidential data. This policy applies to all internal and external engineers and developers of FlowFuse software and infrastructure.

## Secure Development Policy

FlowFuse policy requires that:

1. FlowFuse software engineering and product development is required to follow security best practices. Product should be "Secure by Design" and "Secure by Default".

2. Quality assurance activities must be performed as part of the routine development process. This includes, but not limited to:

   - suitable unit testing included with any change request,
   - peer code reviews prior to merging changes,
   - continual automated testing
   - manual product testing and verification prior to release to production

Code reviews should also cover documentation and tests to ensure our definition of done is achieved.

3. Risk assessment activities (i.e. threat modeling) must be performed for a new product or major changes to an existing product.

4. Security requirements must be defined, tracked, and implemented.

5. Security analysis must be performed for any open source software and/or third-party components and dependencies included in FlowFuse software products.

6. Static application security testing (SAST) must be performed throughout development and prior to each release.

7. Dynamic application security testing (DAST) must be performed prior to each release.

8. All critical or high severity security findings must be remediated prior to each release.

9. All critical or high severity vulnerabilities discovered post release must be remediated in the next release or within the defined, predetermined timeframe.

10. Any exception to the remediation of a finding must be documented and approved by the CTO.

## Secure Development Environment

FlowFuse uses separate Staging and Production systems. These are logically segregated environments in different AWS accounts.

The Production environment is classified Critical with suitable controls in place to limit access to the infrastructure.
