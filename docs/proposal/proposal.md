
# School of Computing &mdash; Year 4 Project Proposal Form

> Edit (then commit and push) this document to complete your proposal form.
> Make use of figures / diagrams where appropriate.
>
> Do not rename this file.

## SECTION A

|                         |                                                   |
|-------------------------|---------------------------------------------------|
| **Project Title:**      | Blockchain-based Credential Verification Platform |
| **Student 1 Name:**     | Christopher Dobey                                 |
| **Student 1 ID:**       | 20756959                                          |
| **Student 2 Name:**     | Pádraig Mann                                      |
| **Student 2 ID:**       | 21477812                                          |
| **Project Supervisor:** | *[TBC]* <---------------------                    |

> Ensure that the Supervisor formally agrees to supervise your project; this is only recognised once the
> Supervisor assigns herself/himself via the project Dashboard.
>
> Project proposals without an assigned Supervisor will not be accepted for presentation to the Approval Panel.

## SECTION B

> Guidance: This document is expected to be approximately 3 pages in length, but it can exceed this page limit.
> It is also permissible to carry forward content from this proposal to your later documents (e.g. functional
> specification) as appropriate.
>
> Your proposal must include *at least* the following sections.

### Introduction

In today's digital era, verifying the authenticity of professional credentials, academic qualifications, and personal identification documents is a critical yet challenging task. Traditional methods are often time-consuming, prone to fraud, and lack transparency. Blockchain technology offers a solution by providing a secure, immutable, and decentralized way to verify credentials. This project focuses on developing a **Blockchain-based Credential Verification Platform** that leverages blockchain's capabilities to streamline and secure the verification process across various industries.

### Outline

The proposed project involves developing a web-based platform that allows individuals to store and manage their credentials and identification documents, and organizations to issue and verify these credentials securely. The platform will use blockchain technology to record verification data, ensuring immutability and transparency.

Key components of the project include:

- **Frontend Development**: Using **Vite** with **TypeScript** to build a responsive and user-friendly interface for individuals, organizations, and verifiers.
- **Backend Development**: Utilizing **Fastify** with **TypeScript** to create a scalable and high-performance server, integrating with **PostgreSQL** for data storage.
- **Blockchain Integration**: Implementing smart contracts using **Solidity** and interacting with the Ethereum blockchain via **Ethers.js**.
- **Security Implementation**: Ensuring robust authentication, authorization, and data protection mechanisms.

### Background

The idea for this project stems from the increasing need for secure and efficient methods of credential verification in various sectors such as education, healthcare, employment, and government services. Incidents of fraud and the proliferation of counterfeit credentials have highlighted the limitations of traditional verification methods. Blockchain technology, with its inherent features of decentralization, immutability, and transparency, presents an opportunity to address these challenges. By integrating blockchain with web technologies, the project aims to create a robust system for credential issuance and verification.

### Achievements

**Functions Provided:**

- **Credential Issuance**: Organizations can issue digital credentials, certificates, licenses, or identification documents through the platform.
- **Credential Management**: Individuals can store, manage, and control access to their credentials and identification documents.
- **Selective Sharing**: Users can share specific information or entire documents with verifiers, controlling what gets shared and for how long.
- **Verification Services**: Verifiers can access and verify credentials with user-controlled permissions.
- **Blockchain Verification**: The platform records hashes of credentials on the blockchain, enabling tamper-proof verification of authenticity.

**Users:**

- **Individuals**: Students, professionals, and anyone who needs to store and manage credentials or identification documents.
- **Organizations**: Universities, certification bodies, employers, government agencies, and licensing authorities that issue credentials.
- **Verifiers**: Employers, educational institutions, regulatory bodies, and other entities that need to verify credentials.

### Justification

The platform addresses critical issues in credential verification by providing a secure, efficient, and transparent system. It will be useful in:

- **Preventing Fraud**: Utilizing blockchain's immutability to ensure credentials cannot be tampered with or falsified.
- **Streamlining Verification**: Reducing the time and effort required for verifying credentials, benefiting both individuals and verifiers.
- **Enhancing Privacy and Control**: Allowing individuals to control their personal information, deciding what to share and with whom.
- **Cross-Industry Application**: Applicable in sectors such as education, healthcare, employment, government services, and supply chain management.
- **Facilitating Trust**: Building trust between parties by providing verifiable proof of credentials, essential in professional and regulatory environments.

### Programming language(s)

- **TypeScript**: For both frontend and backend development.
- **Solidity**: For writing smart contracts on the Ethereum blockchain.

### Programming tools / Tech stack

**Frontend:**

- **Vite**: Build tool for frontend development.
- **TypeScript**: Programming language for type safety.

**Backend:**

- **Fastify**: Web framework for Node.js, providing high performance.
- **TypeScript**: For backend development.
- **Ethers.js**: Library for interacting with the Ethereum blockchain.
- **TypeORM**: ORM for database interactions with PostgreSQL.

**Database:**

- **PostgreSQL**: For storing certificates, identification documents, and metadata.

**Blockchain:**

- **Ethereum Blockchain**: Mainnet or compatible networks like Polygon.
- **Solidity**: Programming language for smart contracts.
- **Hardhat**: Development environment for compiling, testing, and deploying smart contracts.

**Testing:**

- **Mocha and Chai**: For unit and integration testing of backend components.
- **Jest**: For frontend testing.

**Version Control and Deployment:**

- **Git and GitHub**: For version control.
- **Docker**: For containerization.
- **Cloud Services** (e.g., AWS, Azure): For deployment.

**Other Tools:**

- **Node.js**: JavaScript runtime environment.
- **npm**: Package manager.

### Hardware

No non-standard hardware components are required for this project. Standard development computers and servers will suffice. Cloud infrastructure will be utilized for deployment, which does not require additional hardware.

### Learning Challenges

- **Fastify Framework**: Learning to build scalable backend applications with Fastify and TypeScript.
- **Ethers.js**: Understanding blockchain interactions using Ethers.js.
- **Solidity and Smart Contracts**: Developing and deploying smart contracts on the Ethereum blockchain using Solidity.
- **Blockchain Concepts**: Deepening knowledge of blockchain technology, including transaction handling, gas fees, and security considerations.
- **TypeORM**: Using TypeORM for database interactions with PostgreSQL.
- **Vite**: Utilizing Vite as a frontend build tool.
- **Deployment**: Setting up continuous integration and deployment pipelines, possibly with Docker and cloud services.
- **Security Best Practices**: Implementing robust authentication, authorization, and data protection mechanisms.
- **User Experience Design**: Designing intuitive interfaces for different user roles.

### Breakdown of Work

#### **Student 1: Christopher Dobey**

- **Project Planning and Management**:
  - Collaborate with Student 2 on research, planning, scheduling, and overall project management.
  - Define project scope and objectives, ensuring alignment with goals.

- **Backend Development**:
  - **Server Setup**: Configure and set up the Fastify server using TypeScript.
  - **API Development**: Develop API endpoints for credential issuance and management functionalities.
  - **Blockchain Integration**:
    - Use **Ethers.js** to interact with the Ethereum blockchain for credential issuance.
    - Implement blockchain interactions related to organizations issuing credentials.
  - **Smart Contract Development**:
    - Develop and deploy smart contracts in Solidity for credential issuance using **Hardhat**.
    - Focus on contracts that handle credential creation and storage on the blockchain.

- **Frontend Development**:
  - **Interface for Organizations**:
    - Design and develop the frontend interface for organizations to issue credentials.
    - Ensure the interface is user-friendly and meets organizational needs.
  - **Frontend-Backend Integration**:
    - Integrate frontend components with backend APIs for organizational functionalities.

- **Security Implementation**:
  - **Authentication and Authorization**:
    - Implement secure login systems for organizations.
    - Set up role-based access control for different organizational roles.

- **Testing and Quality Assurance**:
  - **Backend Unit Testing**:
    - Write unit tests for backend components using **Mocha** and **Chai**.
  - **Smart Contract Testing**:
    - Develop tests for smart contracts to ensure they function as intended.

- **Deployment**:
  - **CI/CD Pipelines**:
    - Set up continuous integration and deployment pipelines for backend services using **Docker** and cloud services.
  - **Backend Deployment**:
    - Deploy backend services and smart contracts to the cloud environment.

- **Documentation**:
  - **Technical Documentation**:
    - Document backend APIs, smart contract interfaces, and system architecture related to credential issuance.
  - **Project Reports**:
    - Contribute to progress reports and final project documentation.

- **Presentation**:
  - **Demonstration**:
    - Prepare and deliver presentations showcasing the organization's perspective and functionalities.
  - **Feedback Incorporation**:
    - Gather feedback related to organizational features and make necessary adjustments.

#### **Student 2: Pádraig Mann**

- **Project Planning and Management**:
  - Work alongside Student 1 in project planning, research, and scheduling.
  - Manage task allocation and monitor project milestones.

- **Backend Development**:
  - **Database Integration**:
    - Implement database schemas and interactions using **TypeORM** and **PostgreSQL**.
    - Focus on storing credentials, user data, and access permissions.
  - **API Development**:
    - Develop API endpoints for credential sharing, verification, and user management.
  - **Blockchain Integration**:
    - Utilize **Ethers.js** to interact with the Ethereum blockchain for credential verification.
    - Handle blockchain interactions related to individuals and verifiers.
  - **Smart Contract Development**:
    - Develop and deploy smart contracts in Solidity for credential verification and access control.
    - Use **Hardhat** for compiling and testing contracts.

- **Frontend Development**:
  - **Interface for Individuals and Verifiers**:
    - Design and build the user interface for individuals to manage and share credentials.
    - Develop the interface for verifiers to access and verify credentials.
  - **Frontend-Backend Integration**:
    - Connect frontend components with backend APIs for individual and verifier functionalities.

- **Security Implementation**:
  - **Data Protection**:
    - Implement encryption for data at rest and in transit.
    - Ensure compliance with data privacy regulations and best practices.

- **Testing and Quality Assurance**:
  - **Frontend Unit Testing**:
    - Write unit tests for frontend components using **Jest**.
  - **Integration Testing**:
    - Perform integration tests to ensure seamless interaction between frontend and backend systems.

- **Deployment**:
  - **Scalability**:
    - Optimize the application for scalability, focusing on frontend performance and database efficiency.
  - **Frontend Deployment**:
    - Deploy frontend applications using **Docker** and cloud services.

- **Documentation**:
  - **User Manuals**:
    - Create comprehensive guides for individuals and verifiers to use the platform effectively.
  - **Technical Documentation**:
    - Document frontend architecture, database schemas, and APIs related to user functionalities.

- **Presentation**:
  - **Demonstration**:
    - Prepare and deliver presentations showcasing the individual's and verifier's perspectives.
  - **Feedback Incorporation**:
    - Collect feedback on user experience and make necessary refinements.

#### **Collaborative Responsibilities**

- **Project Planning and Management**:
  - Maintain open communication, hold regular meetings, and update project timelines collaboratively.
  - Jointly make decisions on technology choices, design patterns, and system architecture.

- **Smart Contract Development**:
  - Work together on designing the overall smart contract architecture.
  - Peer-review each other's code to ensure security and efficiency.

- **Security Implementation**:
  - Collaborate on implementing comprehensive security measures across the platform.
  - Conduct joint security audits and penetration testing.

- **Testing and Quality Assurance**:
  - Perform code reviews and pair programming sessions.
  - Test the entire system end-to-end to ensure all components work seamlessly.

- **Deployment**:
  - Set up shared deployment environments.
  - Monitor system performance and address any deployment issues together.

- **Documentation**:
  - Review and edit each other's documentation for clarity and completeness.
  - Ensure all documentation is consistent and up-to-date.

- **Presentation**:
  - Coordinate presentations to provide a cohesive overview of the platform.
  - Rehearse demonstrations together to ensure smooth delivery.

## Example

> Example: Here's how you can include images in markdown documents...

<!-- Basically, just use HTML! -->

<p align="center">
  <img src="./res/sample-diagram.png" width="300px">
</p>

*Figure: Sample architecture diagram illustrating the system components and interactions.*