# Legitify Development Guide

Local notes for working on the app.

## Quick Start (Docker)

```bash
# From the repository root
docker compose up -d

docker compose logs -f
```

Services:

- Frontend: http://localhost
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs
- Database: PostgreSQL on port 5432

## Manual Setup (Without Docker)

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd src/server
npm install

cp server.example.env server.env
# edit server.env

npx prisma migrate dev
npx prisma generate

npm run dev
```

API: http://localhost:3001

### Frontend

```bash
cd src/client
npm install
npm run dev
```

Frontend: http://localhost:5173

## Ledger (optional)

For local Fabric, use the root `docker-compose.yml` which includes the ledger containers and chaincode service.
The Fabric scripts live in `src/ledger/scripts` and are executed inside the Fabric tools container.

## Project Structure

```
src/
├── client/                # Frontend (React/Vite)
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── Dockerfile
│
├── server/                # Backend (Node.js/Express)
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── prisma/        # Database schema
│   │   ├── routes/        # API routes
│   │   └── utils/         # Utilities
│   └── Dockerfile
│
└── ledger/                # Hyperledger Fabric (optional)
    ├── chaincode/         # Chaincode (Go)
    ├── config/            # Fabric config
    └── scripts/           # Fabric init scripts
```

## Environment Variables

### Backend (server.env)

Required:
- `POSTGRES_CONNECTION_URL`
- `JWT_SECRET`
- `API_URL`
- `FRONTEND_URL`

Optional:
- `MOCK_LEDGER` (default: `false`)
- `FABRIC_CERTIFICATES_PATH` (default in container: `/app/fabric-data/organizations/peerOrganizations`)
- `FABRIC_CHANNEL` (default: `legitifychannel`)
- `FABRIC_CHAINCODE` (default: `credentialCC`)
- `MAINTENANCE_MODE` (default: `false`)
- `MAINTENANCE_BYPASS_TOKEN`

### Frontend

- `VITE_API_URL` (default: `http://localhost:3001`)

## Testing

```bash
cd src/server
npm test

cd src/client
npm test
```
