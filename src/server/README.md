# Fabric Degree API - TypeScript

This project provides an API for managing degrees using Hyperledger Fabric and TypeScript. Follow the steps below to set up and test the application.

## Prerequisites

- Docker
- Docker Compose
- Node.js
- PostgreSQL

## Setup Guide

### 1. Start the Legitify Network

Navigate to the `ledger` directory and run the `startnetwork.sh` script to start the Hyperledger Fabric network.

```sh
cd /path/to/ledger
./startnetwork.sh
```

### 2. Start PostgreSQL with Docker

Navigate to the `server` directory and use Docker to start a PostgreSQL container.

```sh
cd /path/to/server/database
docker run --name my-postgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres:14
```

### 3. Register the Admins

Navigate to the `server` directory and run the `enrollAdmin.ts` script to register the admin users. If you encounter issues, you may need to delete the previous `wallet` directory as it could cause conflicts with the new identities.

```sh
cd /path/to/server
rm -rf wallet
ts-node enrollAdmin.ts
```

### 4. Start the API Server

Navigate to the `server` directory and start the API server.

```sh
cd /path/to/server
npm install
npx ts-node src/app.ts // need to setup an npm start script for this
```

### 5. Test Authentication Using Swagger

Open your browser and navigate to the Swagger UI to test the authentication endpoints.

```
http://localhost:3000/docs
```

You can use the Swagger UI to test the following endpoints:

- `POST /auth/login`: Log in to obtain a JWT token.
- `GET /user`: Get user information (requires JWT token).
- `POST /users`: Register a new user.
- `GET /secured`: Access a secured endpoint (requires JWT token).

#### Example Usage

Log in to obtain a JWT token:

1. Use the `/auth/login` endpoint with your username and password.
2. Copy the JWT token from the response.

Authorize in Swagger:

1. Click the "Authorize" button in the Swagger UI.
2. Enter the JWT token in the format `Bearer <your_jwt_token>`.

Access secured endpoints:

- Use the `/secured` endpoint to verify that the authentication is working.

## Additional Information

- Ensure that the environment variables are correctly set in the `.env` file.
- The API server will be running on the port specified in the `.env` file (default is 3000).
- For more detailed information, refer to the project documentation and code comments.
