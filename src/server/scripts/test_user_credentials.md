# Legitify Test User Credentials

This document contains login credentials for all test users created by the demonstration and testing scripts.

## Test Flow Script Users

These users are created with the `test-flow.sh` script and have stronger passwords:

| Role     | Email             | Password     | Username     |
| -------- | ----------------- | ------------ | ------------ |
| Issuer   | issuer@test.com   | Password123! | testissuer   |
| Holder   | holder@test.com   | Password123! | testholder   |
| Verifier | verifier@test.com | Password123! | testverifier |

## Demo Setup Script Users

These users are created with the `demo_setup.sh` script and all use the same password: `Password123!`

### University Administrators

| University                            | Email             | Role   |
| ------------------------------------- | ----------------- | ------ |
| Dublin City University (DCU)          | admin@dcu.com     | issuer |
| University College Dublin (UCD)       | admin@ucd.ie      | issuer |
| Technological University Dublin (TUD) | admin@tudublin.ie | issuer |

### University Lecturers

| University                            | Email                | Role   |
| ------------------------------------- | -------------------- | ------ |
| Dublin City University (DCU)          | lecturer@dcu.com     | issuer |
| University College Dublin (UCD)       | lecturer@ucd.ie      | issuer |
| Technological University Dublin (TUD) | lecturer@tudublin.ie | issuer |

### University Students

| University                            | Email               | Role   |
| ------------------------------------- | ------------------- | ------ |
| Dublin City University (DCU)          | student@dcu.com     | holder |
| University College Dublin (UCD)       | student@ucd.ie      | holder |
| Technological University Dublin (TUD) | student@tudublin.ie | holder |

### Verifiers

| Email              | Role     |
| ------------------ | -------- |
| verifier@test.com  | verifier |
| verifier2@test.com | verifier |

### Multi-Organization Holders

These holders are affiliated with multiple university organizations:

| Name             | Email          | Role   |
| ---------------- | -------------- | ------ |
| Bob The Builder  | bob@test.com   | holder |
| Alice Wonderland | alice@test.com | holder |

## Usage Notes

- All accounts created by the `demo_setup.sh` script use password: `Password123!`
- All accounts created by the `test-flow.sh` script use password: `Password123!`
- The test-flow script creates a credential for holder@test.com and demonstrates the full credential issuance, acceptance, and verification flow
- Demo users have various credentials in different states (issued, accepted, verification requested, verification granted)
