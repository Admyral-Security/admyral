# Cryptography Policy

Policy owner: @knolleary
Effective date: 2023-06-01

## Purpose

To ensure proper and effective use of cryptography to protect the confidentiality, authenticity and/or integrity of information. This policy establishes requirements for the use and protection of cryptographic keys and cryptographic methods throughout the entire encryption lifecycle.

## Scope

All FlowFuse data, information and information systems that handle confidential or critical information.

## Cryptography Policy

FlowFuse requires all team members apply appropriate cryptographic controls in handling of data. Where encryption is in use, strong cryptography with associated key management processes and procedures shall be implemented. All encryption shall be performed in accordance with industry standards, including NIST SP 800-57.

Customer or confidential company data must utilize strong ciphers and configurations in accordance with vendor recommendations and industry best practices including NIST when stored or transferred over a public network.

FlowFuse requires all team members to comply with the cryptography policy, such that:

- All Production Data at rest is stored on encrypted volumes.

- Volume encryption keys are protected from unauthorized access. Volume encryption key material is protected with access controls such that the key material is only accessible by privileged accounts.

- Encrypted volumes use strong cipher algorithms, key strength, and key management process.

- Data is protected in transit using recent TLS versions with ciphers recognized as secure.

## Local disk/volume encryption

Encryption and key management for local disk encryption of end-user devices follow the defined best practices for Windows, macOS, and Linux/Unix operating systems, such as Bitlocker and FileVault.

## Protecting data in transit

All external data transmission is encrypted end-to-end. This includes, but is not limited to, cloud infrastructure and third-party vendors and applications.

Transmission encryption keys and systems that generate keys are protected from unauthorized access. Transmission encryption key materials are protected with access controls and may only be accessed by privileged accounts.

TLS endpoints must score at least an "B" on SSLLabs.com.

Transmission encryption keys are limited to use for one year and then must be regenerated.

## Encryption of portable and removable media devices

It is mandatory for all employees and contractors to use full disk encryption on any portable or removable media device that stores, processes, or transfers company-related information. This includes but is not limited to USB drives, external hard drives, and SD cards.

## Exceptions

Requests for an exception to this policy must be submitted to the CEO or CTO for approval.

## Violations & Enforcement

Any known violations of this policy should be reported to the CEO or CTO. Violations of this policy can result in immediate withdrawal or suspension of system access and/or disciplinary action in accordance with company procedures up to and including termination of employment.
