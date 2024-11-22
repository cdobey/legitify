# Student Declaration of Academic Integrity

| Names & ID numbers | Christopher Dobey (20756959), Padraig Mann (21477812) |
| --- | --- |
| Programme | CASE4/COMSCI4 – Computer and Software Engineering – Year 4 |
| --- | --- |
| Module Code | CSC1097 |
| --- | --- |
| Assignment Title | CSC1097 – Final Year Project - Functional Specification |
| --- | --- |
| Submission Date | 22/11/2024 |
| --- | --- |

I understand that the University regards breaches of academic integrity and plagiarism as grave and serious. I have read and understood the DCU Academic Integrity and Plagiarism Policy. I accept the penalties that may be imposed should I engage in practice or practices that breach this policy. I have identified and included the source of all facts, ideas, opinions and viewpoints of others in the assignment references. Direct quotations, paraphrasing, discussion of ideas from books, journal articles, internet sources, module text, or any other source whatsoever are acknowledged and the sources cited are identified in the assignment references. I declare that this material, which I now submit for assessment, is entirely my own work and has not been taken from the work of others save and to the extent that such work has been cited and acknowledged within the text of my work.

I have used the DCU library referencing guidelines (available at <https://www4.dcu.ie/library/classes_and_tutorials/citingreferencing.shtml> and/or the appropriate referencing system recommended in the assignment guidelines and/or programme documentation. By signing this form or by submitting material online I confirm that this assignment, or any part of it, has not been previously submitted by me or any other person for assessment on this or any other course of study.

By signing this form or by submitting material for assessment online I confirm that I have read and understood the DCU Academic Integrity and Plagiarism Policy (available at <http://www.dcu.ie/registry/examinations/index.shtml>).

Signatures: Christopher Dobey / Padraig Mann

Date: 22/11/24

# **_Table of Contents_**

[**Student Declaration of Academic Integrity 1**](#_todqxopewkx1)

[**Table of Contents 2**](#_gjdgxs)

[**Introduction - Padraig 3**](#_3znysh7)

[Overview 3](#_6tra1zuvrgq0)

[Business Context 3](#_qbca3bmla3xw)

[Glossary 4](#_uforaaagfxcw)

[**General Description - Chris 5**](#_tyjcwt)

[Product / System Functions 5](#_1t3h5sf)

[Credential Issuance 5](#_7rlpppsbej05)

[Verification Requests 5](#_hdg8rtvo8o6d)

[Blockchain Validation 5](#_2mk0uti5rbx)

[User Control 5](#_nn05ccctwwt8)

[User Characteristics and Objectives 5](#_2s8eyo1)

[Individuals 5](#_6dcuo6veraqr)

[Organisations 6](#_qd3f9us99kes)

[Operational Scenarios 6](#_3rdcrjn)

University Credential Verification 6

Employment History Verification 6

[Identification Verification 6](#_y2wdxneia5i4)

[Constraints 6](#_lnxbz9)

Performance 6

Regulatory Compliance 7

[Technical Limitations 7](#_2ouybmj48kom)

[**Functional Requirements - Chris 7**](#_1ksv4uv)

[Credential Issuance 7](#_2jxsxqh)

[Credential Verification 7](#_oonqfevm1kj5)

[User Management 8](#_1acp8wy5fg0c)

[Blockchain Interaction 8](#_fdi6fug6buws)

[Frontend Features 8](#_t5nvibftecqt)

[Reporting and Analytics 9](#_5dlv65jl9hjc)

[Data Security and Privacy 9](#_f2ib0sd3ynal)

[Testing and Quality Assurance 9](#_d664tj1e6508)

[**System Architecture - Padraig 10**](#_ykmy737g00dz)

[**High-Level Design - Padraig 10**](#_3tbugp1)

[**Preliminary Schedule - Chris 10**](#_2lwamvv)

[1\. Research and Planning (November 1–14, 2024) 11](#_4r9ekj9dzmo)

[2\. Design Phase (November 15–28, 2024) 11](#_qu7xkwg5jij1)

[3\. Backend Development (November 29–December 26, 2024) 11](#_96bgwu5f9e1c)

[4\. Smart Contract Development (December 27, 2024–January 9, 2025) 11](#_oixqx4qw8qnx)

[5\. Frontend Development (January 10–February 6, 2025) 11](#_akhwenymsro)

[6\. Testing and Quality Assurance (February 7–20, 2025) 11](#_t3wswb7t318d)

[7\. Deployment (February 21–March 5, 2025) 11](#_4zr3h0jw836s)

[8\. Documentation and Presentation (March 6–April 30, 2025) 12](#_yvun5bu0i9vm)

[**Appendices - both 12**](#_2r0uhxc)

**_Legitify Functional Specification_**

# Introduction

## Overview

In today's digital era, verifying the authenticity of professional credentials, academic qualifications, and personal identification documents is a critical yet challenging task. Traditional methods are often time-consuming, prone to fraud, and lack transparency. We believe that blockchain technology offers a solution by providing a secure, immutable and decentralised way to verify credentials. Our project proposes the development of a Blockchain-based Credential Verification Platform, ‘Legitify’, that utilises blockchain's capabilities to create a secure and streamlined verification process.

Legitify will serve as a centralised hub where individuals can store and manage their credentials and organisations can issue and verify these credentials securely. The system will use blockchain technology to record verification data, ensuring immutability and transparency. The backend will be developed using Fastify with TypeScript, PostgreSQL will be used for storing credential files and metadata and the blockchain interactions will be handled using Ethers.js. We will be interfacing with the Ethereum blockchain or other compatible networks like Polygon.

We believe that there is the opportunity to expand Legitify to allow it to be incorporated into other systems, for example allowing people to store credentials like personal identification in digital wallets. This expansion would involve liaising with Apple and Google who are the leading developers of digital wallets, which could be outside the scope of our project considering our limited timescale but could be explored if we were looking to develop Legitify further.

## Business Context

The Legitify Platform aims to meet the growing demand for secure and efficient credential verification in multiple sectors, including education, healthcare, government, and employment. There are a lot of current verification processes that have problems, such as significant time delays, manual intervention, and vulnerability to fraud. By using blockchain technology, this platform offers an efficient and trustworthy alternative, significantly reducing the risk of fraud while improving operational efficiency.

Target Audience:

**Individuals** will have control over their personal credentials, enabling them to manage, store, and share verified credentials securely.

**Organisations** (such as universities, certification bodies, and employers) can issue digital credentials, ensuring that these credentials are tamper-proof and can be easily verified by authorised entities.

**Verifiers**, including employers, academic institutions, and regulatory bodies, can securely authenticate credentials, reducing the administrative burden and ensuring quick, accurate verification.

Strategic Goals:

**Enhanced Trust and Security:** The use of blockchain ensures that credentials are tamper-proof and secure.

**Operational Efficiency:** Streamlining the verification process reduces the administrative workload and time spent on credential verification.

**Transparency and Accountability:** The immutable nature of blockchain provides transparency in the credentialing process, ensuring that all verification actions are traceable.

Business Impact:

The platform is aligned with the industry's move towards digital transformation, particularly in credentialing and identity management. Blockchain provides a new standard for security, efficiency, and trust across various industries, improving both the user and organisational experience.

Stakeholders:

**Individuals (students, professionals, job seekers):** Store and manage personal credentials.

**Organisations (educational institutions, employers, regulatory bodies):** Issue and verify credentials.

**Verifiers (employers, academic institutions, government agencies):** Authenticate credentials securely and efficiently.

## Glossary

**Blockchain**: A decentralised and distributed digital ledger that records transactions across many computers in a way that ensures the records are secure and tamper-proof.

**Credential Issuance**: The process of generating and providing verified digital credentials to an individual or entity.

**Credential Verification**: The process of validating the authenticity of credentials against a trusted source, such as a blockchain.

**Ethereum**: A decentralised, open-source blockchain system that features smart contract functionality.

**Ethers.js**: A JavaScript library used to interact with the Ethereum blockchain and smart contracts.

**Fastify**: A Node.js web framework used to build APIs with high performance and low overhead.

**GDPR**: General Data Protection Regulation, a regulation in EU law on data protection and privacy.

**Hash**: A fixed-size alphanumeric string produced by a cryptographic algorithm, representing data securely.

**Immutable**: A property of data that ensures it cannot be altered or deleted once written.

**Polygon**: A framework for building and connecting Ethereum-compatible blockchain networks.

**PostgreSQL**: An open-source relational database management system.

**Selective Sharing**: Allowing users to control which parts of their credentials are shared and with whom.

**Smart Contract**: Self-executing contracts with the terms of the agreement directly written into lines of code.

**Tamper-Proof**: The quality of being secure against unauthorised alterations.

**TypeORM**: An ORM (Object Relational Mapper) for TypeScript and JavaScript, supporting database management.

**Vite**: A modern frontend build tool for faster development

# General Description

## Product / System Functions

Legitify is a proposed blockchain based verification platform that allows users to issue, manage and verify various credentials from a number of different sectors, such as education, employment etc. It’s core functionalities are as follows:

#### Credential Issuance

Organisations can upload, manage or issue digital copies of credentials which can then be issued to individuals and stored securely on the system.

#### Verification Requests

The platform will allow users such as employers, to request verifications through the system which will need to be approved by the owner before being securely shared.

#### Blockchain Validation

Credentials can be verified against the blockchain to ensure that they are valid at the time of validation. This will be done by comparing hashes to those stored on the ledger to confirm authenticity.

#### User Control

Individuals can view their credentials, selectively share them with verifiers and manage access to them through the platform. Users should be able to selectively share partial pieces of information as well as revoke access at will.

## User Characteristics and Objectives

#### Individuals

Individual users are likely to have no advanced technical skills but will be presumed to be proficient enough with digital tools to manage their credentials using the platform. They should be able to:

- Store and manage credentials on the system
- Share credentials selectively with verifiers
- Maintain control of their credentials, being able to revoke access at any point

#### Organisations

Organisational users are likely to have more technical familiarity with managing credentials and are likely to perform verification operations more often, aiding familiarity. They should be able to:

- Issue immutable credentials
- Manage existing credentials they have been given access to
- Easily request to verify additional credentials on the system

## Operational Scenarios

The platform will support a number of different operational scenarios and should be flexible enough to facilitate additional scenarios to align with the requirements of the platform’s users. Some baseline scenarios are as follows:

#### University Credential Verification

The platform should allow universities to issue a degree to students on the platform, which will then be hashed and stored on the blockchain. Employers can then request access to details of this certification through the platform which can be accepted by the certifications owner without requiring the college to manually contact the university that issued the certification.

#### Employment History Verification

The platform should allow an organisation to upload details of a current or former employee’s employment with the organisation. Future employers should then be able to verify this history of employment without having to request it directly from the original issuer.

#### Identification Verification

The platform should allow a government agency for example to issue a Driver’s licence to a user. In a traffic stop scenario, a guard should have the ability to reliably check the validity of the document automatically, without having to contact the issuer.

## Constraints

A number of constraints are anticipated for the development of this platform, and will have to be given ample consideration during the development process. Some of these constraints which have been identified thus far include:

#### Performance

The system must be designed to scale to handle a high volume of simultaneous requests, which may be limited by the performance of the ledger. This will be an important factor to consider during development to ensure that the system works efficiently not just for a small volume of requests, but for a large number of concurrent activities on the platform.

#### Regulatory Compliance

Given that the system has the potential to handle sensitive information about individuals, it must be designed to handle data safely and securely, in compliance with privacy laws such as GDPR or other industry specific standards.

#### Technical Limitations

Reliance on blockchain networks for hash storage may introduce transaction delays out of control of the system depending on the load on these external networks. Ensuring the system handles these delays gracefully will be important for system usability and user experience.

# Functional Requirements

## Credential Issuance

**_Description:_** Organisations must be able to issue immutable copies of credentials for individuals within the system.

**Criticality:** High

**Technical Issues:**

- Ensure integrity of all metadata related to an issuance during creation.
- Must be flexible enough to be compatible with a range of document types.

**Dependencies:**

- Secure integration with PostgreSQL database.
- Blockchain hash generation and storage on ledger.

## Credential Verification

**Description:** Verifiers must be able to request and validate user credentials by comparing blockchain hashes with the records on the platform.

**Criticality:** High

**Technical Issues:**

- Reduce blockchain latency for high efficiency verifications.
- System should handle credential expiration as well as revoked access gracefully.

**Dependencies:**

- Real time blockchain hash comparisons on the platforms frontend.
- Management of user consent (approve/reject) for verifications.

## User Management

**Description:** System should allow role based access of platform mechanics for individuals, organisations, and verifiers.

**Criticality:** Medium

**Technical Issues:**

- User authentication (2FA).
- Enforcing access to certain aspects of the system based on the user's role.

**Dependencies:**

- Front-end integration with APIs for managing user permissions on backend.
- Secure credential storage.

## Blockchain Interaction

**Description:** Platform should be capable of recording hashes of credentials on the blockchain to ensure their immutability.

**Criticality:** High

**Technical Issues:**

- Integrating smart contracts with backend API
- Minimising gas fees to reduce transaction costs on the platform

**Dependencies:**

- Smart contract deployment (tested using hardhat)

## Frontend Features

**Description:** Platform should provide a user friendly means of managing credentials and credential verification that is intuitive and easy to use.

**Criticality:** Medium

**Technical Issues:**

- Ensuring responsive platform design.
- Integrating with the backend to display real time updates from the blockchain.

**Dependencies:**

- Front-end deployed using Vite.
- Backend API’s allowing credential issuance and verification.

## Reporting and Analytics

**Description:** Gather information and logs about usage and generate reports based on users usage of the platform.

**Criticality:** Low

**Technical Issues:**

- Provide some way of exporting logs of verifications / issuances.

**Dependencies:**

- PostgreSQL database integrated with backend.
- Logging of user activities such as issuance or verifications made.

## Data Security and Privacy

**Description:** Ensure that data stored either on the ledger or in the database is stored and handled securely.

**Criticality:** High

**Technical Issues:**

- Encrypting sensitive information to prevent user data from becoming vulnerable.

**Dependencies:**

- Secure database retrieval with suitable user access and authentication.

## Testing and Quality Assurance

**Description:** The system should be stable, handle errors gracefully and operate as expected, even at scale.

**Criticality:** Medium

**Technical Issues:**

- Developing a CI/CD pipeline for end to end testing of the system.
- Simulating high load on the system.
- Integrating comprehensive test cases to ensure stability of the system when changes are made to it.

**Dependencies:**

- Integration with GitLab CI for E2E testing.
- Implementation of testing libraries for both the frontend and backend, as well as the blockchain network.

# System Architecture
![](Images/System%20Architecture%20(1).png)

Front-End Level

This level of the System’s Architecture consists of a web application which is what users will be using to interact with our system. When the user first creates an account for the website, they will be prompted to select whether the account is for an Individual, an Organisation or a Verifier. The user’s selection will dictate which interface they will use on the website. The Front-End will be developed using Vite and TypeScript.

Back-End Level

This level includes an API server which interacts with the Front-End by handling User Requests along with credential management, issuance and verification. This level also deals with User authentication and authorisation, ensuring there are secure interactions between users of different types. The Back-End also facilitates communication for the Blockchain and Database Levels for storage and verification purposes of the credential hash and user information respectively. The Back-end will be developed using Fastify and TypeScript to maintain consistency with the Front-End.

Blockchain Level

The Blockchain Level is where the hash of each credential is stored to ensure that they cannot be tampered with as the Blockchain provides immutability and traceability. This level also handles the permissions or access data for each credential to enforce selective sharing of the credential only with the user’s desired parties. Ether.js is used to interact with the Ethereum blockchain in the Back-End.

Database Level

The Database Level is a PostgreSQL Database that stores the user’s information. The database consists of user information such as profiles and account details, along with metadata for each credential, including the organisation that issued it, expiration date and a pointer to the hash on the blockchain for verification purposes. The database also stores permissions and access data specifying which users have access to what credentials. Finally the database keeps a record of the verification requests and responses should this information be needed later.

External Integrations

The External Integrations would include some additional services for the website that would prove useful. Cloud storage which could hold credential information or other large pieces of data that would not be suitable for either the blockchain or database. Additionally, third-party verification services to authenticate users during registration would add extra security to the website to ensure only verified individuals or organisations could use the platform.

#

#

#

#

#

#

#

#

# High-Level Design

UML Model Diagram
![](Images/UML%20Class%20Diagram.png)

Data Flow Diagram

![](Images/Data%20Flow%20Diagram.png)

# Preliminary Schedule

This project will run for approximately 6 months. We have begun work on it already, as of the 1st November 2024, and the project will continue to run through until 30th April 2025. Below is a Gantt chart which provides a high level overview of our expected timeline for this project, and underneath is each phase listed in more detail as to what we hope to achieve.

![](data:image/png;base64,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)

## Research and Planning (November 1–14, 2024)

As part of phase 1 we hope to define our projects objectives, scope and deliverables. We will deliver a functional spec that has been defined based on extensive research into blockchain credential systems and existing solutions in the field to help us decipher how we will implement our project's objectives.

## Design Phase (November 15–28, 2024)

In phase 2 we will develop various wireframes and necessary system diagrams, so that we can build a framework from which to implement on top of. We will also outline our database schemas and API structures so that we have an overall understanding of the high level system design.

## Backend Development (November 29–December 26, 2024)

For part 3, we will first begin development of our backend system. This backbone will be vital to get right before we can start to build our smart contract solution on top of. We will configure our express based backend framework, as well as build out our postgreSQL database. We will also develop the necessary API endpoints for credential issuance and management.

## Smart Contract Development (December 27, 2024–January 9, 2025)

Once phase 3 is complete, we will have the necessary framework to start building our smart contracts on top of. As part of phase 4, we will design and deploy our solidity based smart contracts using hardhat, and we will then test integration with our backend API to ensure we can successfully complete credential issuance.

## Frontend Development (January 10–February 6, 2025)

For phase 5, now that we have our backend architecture and smart contracts in place, we can begin to build out the frontend of our application. This will involve building out interfaces to be used by both individuals and organisations. We will integrate this frontend with our backend APIs so that we have a fully integrated front end solution with all basic functionalities.

## Testing and Quality Assurance (February 7–20, 2025)

In phase 6, we will design and implement unit and integration testing to ensure that our solution works as expected in a variety of scenarios. We should be able to fully test all elements of the system and be able to identify any potential issues with our implementation.

## Deployment (February 21–March 5, 2025)

In phase 7, we would like to attempt to deploy our solution through the use of cloud infrastructure to support our backend and smart contracts and docker to host our frontend before deploying live to test its real world usability.

## Documentation and Presentation (March 6–April 30, 2025)

In the final phase of this project, we will create all documentation relevant to use and deploy our project so that it can be assessed clearly and re-created easily. We will also put together final deliverables including presentations and demonstrations to be put forward for assessment.

# Appendices - both

## Appendix A: System Diagrams

- **High-Level System Architecture Diagram**: Illustrates the system's layered architecture, showing the interaction between the frontend, backend, blockchain, database, and external integrations.
- **UML Model Diagram**: Represents key system components, their relationships, and the flow of data between them.
- **Data Flow Diagram**: Depicts how data moves through the system, from user input to blockchain verification and database storage.

## Appendix B: Tools and Technologies

- **Frontend Development**: Vite, TypeScript.
- **Backend Development**: Fastify, TypeScript, TypeORM.
- **Blockchain Interaction**: Solidity, Ethers.js, Hardhat.
- **Database**: PostgreSQL.
- **Testing Frameworks**: Mocha, Chai, Vitest.
- **Deployment Tools**: Docker, GitLab, AWS (or similar).

## Appendix C: Regulatory and Compliance Considerations

- **GDPR Compliance**: Ensures data privacy for users within the EU by adhering to secure storage and sharing practices.
- **Data Encryption Standards**: Ensuring data is encrypted during storage and transmission.
- **Blockchain Network Fees**: Managing gas fees on Ethereum or Polygon networks to minimise user costs.

## Appendix D: References

- **Blockchain Use in Credential Verification**: Articles and case studies showcasing blockchain solutions in education and employment sectors.
- **GDPR Documentation**: Guidelines for handling personal data in compliance with EU regulations.
- **Ethereum and Polygon Documentation**: Technical details on interacting with these blockchain networks.

## Appendix E: Project Deliverables

- Functional Specification Document.
- System Design Diagrams (UML, DFD, Architectural Overview).
- API Documentation.
- Deployment and User Manuals.
- Final Presentation and Demonstration Materials.