# **Project Setup & Usage Guide**

Welcome! This README will walk you through:

1. [Setting up the Hyperledger Fabric Ledger](#1-setting-up-the-hyperledger-fabric-ledger)
2. [Starting the Backend Server (TypeScript + PostgreSQL + Prisma)](#2-setting-up-the-backend-server)

By the end, you’ll be able to issue and manage degrees on the Fabric ledger and test the APIs via Swagger UI.

---

## **Prerequisites**

1. **Docker & Docker Compose**

   - [Docker Installation Guide](https://docs.docker.com/engine/install/)
   - Make sure Docker is **running** before starting any Fabric containers.

2. **Go (Golang) v1.17+** (For chaincode compilation)

   - [Go Download](https://go.dev/dl/)

3. **Node.js v14+ & npm** (For the backend server)

   - [Node.js Download](https://nodejs.org/)

4. **PostgreSQL**

   - Either install locally ([instructions](https://www.postgresql.org/download/))
   - **OR** run via Docker (see [PostgreSQL Docker Image](https://hub.docker.com/_/postgres))

5. **Hyperledger Fabric Binaries**
   - Place Fabric CLI binaries (`peer`, `orderer`, `configtxgen`, etc.) into `src/ledger/bin/` so that our scripts can access them.

---

## **Repository Structure**

A high-level look at the relevant folders:

```
my-project/
├── src/
│   ├── ledger/
│   │   ├── bin/               <- Fabric binaries go here
│   │   ├── chaincode/
│   │   │   └── degreeChaincode.go
│   │   ├── legitify-network/
│   │   │   ├── scripts/
│   │   │   │   ├── startNetwork.sh
│   │   │   │   ├── stopNetwork.sh
│   │   │   │   └── testDegreeChaincode.sh
│   │   │   ├── network.sh
│   │   │   ├── .env
│   │   │   └── ...
│   │   └── install-fabric.sh
│   └── server/                <- Our TypeScript/Node.js backend
│       ├── .env
│       ├── prisma/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── controllers/
│       │   ├── config/
│       │   ├── middleware/
│       │   ├── prisma/
│       │   └── routes/
│       └── ...
└── README.md (this file)
```

> **Note:** Exact filenames may vary; the above is a typical structure.

---

# **1. Setting up the Hyperledger Fabric Ledger**

## **1.1 Install Fabric Binaries**

1. **Navigate to** `src/ledger`:
   ```bash
   cd src/ledger
   ```
2. **Run** `install-fabric.sh` (if using x86_64):
   ```bash
   bash install-fabric.sh --fabric-version 2.5.10 binary --ca-version 1.5.13
   ```
3. **Verify** the `bin/` folder contains the Fabric CLI tools (`peer`, `orderer`, etc.).
4. **Set Executable Permissions** (if needed):
   ```bash
   chmod +x bin/*
   ```

---

## **1.2 Start the Fabric Network**

1. **Go to** `legitify-network`:
   ```bash
   cd legitify-network
   ```
2. **Start the Network**:

   ```bash
   bash scripts/startNetwork.sh
   ```

   - **What happens**:
     1. Shuts down any existing Fabric network.
     2. Spins up the new network with CouchDB.
     3. Creates a channel (`mychannel`).
     4. Deploys the chaincode (`degreeChaincode.go`).
   - **Duration**: Can take a few minutes, especially on first run.

3. **Confirm** the network is running:
   ```bash
   docker ps
   ```
   You should see containers for peers, orderers, and CAs for **OrgUniversity**, **OrgEmployer**, and **OrgIndividual**.

---

## **1.3 Test the Chaincode**

1. **Optional**: Once the network is up, run:
   ```bash
   bash scripts/testDegreeChaincode.sh
   ```
   - This script **issues a degree**, **accepts it**, **denies it**, and **verifies** the document hash.
   - If successful, you’ll see output ending with:
     ```
     All tests completed!
     ```

Congrats! Your Fabric ledger is up and working.

---

# **2. Setting up the Backend Server**

Our backend is a **TypeScript** + **Express** app that uses **Prisma** (PostgreSQL ORM) and integrates with **Fabric CA** to handle registration, login, and degree management transactions on the Fabric network.

## **2.1 Prerequisites**

1. **PostgreSQL**:

   - Run via Docker using Docker Compose:
     ```bash
     docker-compose up -d
     ```

2. **Database Configuration**:
   - Make sure you **update** the `.env` file in `src/server/` with your PostgreSQL connection details.

---

## **2.2 Environment Variables**

In `src/server/.env`, you’ll typically have:

```bash
# Example .env
FABRIC_CONNECTION=../ledger/legitify-network/organizations/peerOrganizations/orguniversity.com/connection-orguniversity.json
FABRIC_WALLET=./src/wallet
FABRIC_CHANNEL=mychannel
FABRIC_CHAINCODE=degreeCC
FABRIC_USER=appUser
DB_HOST=localhost
DB_NAME=my_fabric_db
DB_USER=postgres
DB_PASS=postgrespw
PORT=3001
JWT_SECRET=MySuperSecretJWTKey

# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL="postgresql://postgres:postgrespw@127.0.0.1:5432/my_fabric_db?schema=public"

```

> **Important**: Keep your `.env` **private** and **never** commit secrets to version control.

---

## **2.3 Install Dependencies**

From the **`src/server`** directory:

```bash
cd ../server
npm install
```

This installs all required packages, including Prisma, Fabric CA Client, Express, etc.

---

## **2.4 Run Database Migrations**

Prisma uses **migrations** to sync your database schema:

```bash
npx prisma migrate dev --name init
```

```bash
npx prisma generate
```

- **`migrate dev`** creates tables in your database.
- **`prisma generate`** regenerates the Prisma Client based on your schema.

> **Tip**: You can also run `npx prisma studio` to view your database data in a web UI.

---

## **2.5 Start the Server**

1. **Development Mode** (live reload with `ts-node-dev`):
   ```bash
   npm run dev
   ```
   - Server logs will appear in your console.
2. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

**Default Port**: `3001` (see your `.env` for `PORT`).

---

## **2.6 Swagger API Documentation**

Our backend exposes a **Swagger UI** at:

```
http://localhost:3001/docs
```

- **Register** users: `POST /auth/register`
- **Login** (JWT): `POST /auth/login`
- **Degree Management**: `POST /degree/issue`, `POST /degree/accept`, etc.

Each endpoint’s parameters and expected responses are documented in Swagger.

---

# **Usage Flow Example**

1. **Start Fabric Network**
   - `cd src/ledger/legitify-network && bash scripts/startNetwork.sh`
2. **Start Backend**
   - `cd src/server && npm run dev`
3. **Navigate to Swagger**
   - Visit `http://localhost:3001/docs` in your browser.
4. **Register a New User**
   - **POST** `/auth/register`
   - Sample JSON body:
     ```json
     {
       "username": "alice",
       "password": "alicepw",
       "role": "individual",
       "orgName": "orgindividual"
     }
     ```
   - This enrolls the user in **Fabric CA** and creates a record in **PostgreSQL**.
5. **Login**
   - **POST** `/auth/login`
   - Use the same credentials (`alice`, `alicepw`).
   - **Response**: Returns a JWT token. Copy it.
6. **Test an Endpoint**
   - For example, if you have a user with role `"university"`, you can **issue a degree**:
     ```json
     {
       "individualId": "uuid-of-user",
       "base64File": "base64-encoded-document"
     }
     ```
   - Add `Authorization: Bearer <token>` to the request headers.

---

# **Troubleshooting Tips**

1. **Port Conflicts**

   - If 5432 (PostgreSQL), 7051/8051/9051 (Fabric peers), or 3001 (Node server) are in use, update your `.env` or Docker Compose files with alternative ports.

2. **Docker Resource Limits**

   - Allocate at least **4GB** of RAM to Docker for Fabric.

3. **Fabric Binaries**

   - Ensure you have the correct Fabric binaries for your OS/architecture in `src/ledger/bin/`.

4. **Clearing State**

   - If you run into issues, stop the network:
     ```bash
     bash scripts/stopNetwork.sh
     docker system prune -af --volumes
     ```
   - Then start fresh:
     ```bash
     bash scripts/startNetwork.sh
     ```

5. **Database Connection**

   - Confirm `DATABASE_URL` is correct in `src/server/.env` and that PostgreSQL is accessible.

6. **Node/TypeScript Issues**
   - Check `npm install` for dependency errors.
   - Make sure to run `npx prisma migrate dev && npx prisma generate` after any schema changes.

---

# **Summary**

1. **Ledger Setup**:

   - Install Fabric binaries, run `startNetwork.sh`, confirm chaincode deployed.

2. **Backend Setup**:
   - Ensure PostgreSQL is running.
   - `npm install`, migrate with Prisma.
   - Start the server, visit **Swagger** at `/docs`.

With both components running, you can **create users**, **issue degrees**, and **interact** with the chaincode via the **TypeScript** backend and **PostgreSQL** database.
