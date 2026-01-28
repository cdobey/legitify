# Legitify Development Guide

Welcome! This guide covers local development setup for Legitify.

## Quick Start (Docker)

The easiest way to get started is using Docker Compose:

```bash
# From the repository root
docker compose up -d

# View logs
docker compose logs -f
```

This starts:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/docs
- **Database**: PostgreSQL on port 5432

To stop:

```bash
docker compose down
```

---

## Manual Setup (Without Docker)

### Prerequisites

1. **Node.js v18+** - [Download](https://nodejs.org/)
2. **PostgreSQL** - [Download](https://www.postgresql.org/download/)
3. **Go v1.17+** (only for blockchain features) - [Download](https://go.dev/dl/)

### Backend Setup

1. **Navigate to server directory**:

   ```bash
   cd src/server
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   ```bash
   cp server.example.env server.env
   # Edit server.env with your database credentials
   ```

4. **Setup database**:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The API will be available at http://localhost:3001

### Frontend Setup

1. **Navigate to client directory**:

   ```bash
   cd src/client
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:5173

---

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
    ├── chaincode/         # Smart contracts
    └── legitify-network/  # Network configuration
```

---

## API Documentation

When the backend is running, visit:

- **Swagger UI**: http://localhost:3001/docs

Key endpoints:

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `POST /credential/issue` - Issue a credential (issuer role)
- `GET /credential/holder/:id` - Get credentials for a holder

---

## Testing

### Backend Tests

```bash
cd src/server
npm test
```

### Frontend Tests

```bash
cd src/client
npm test
```

---

## Environment Variables

### Backend (server.env)

| Variable                  | Description                | Default |
| ------------------------- | -------------------------- | ------- |
| `SERVER_PORT`             | API server port            | 3001    |
| `POSTGRES_CONNECTION_URL` | Database connection string | -       |
| `JWT_SECRET`              | Secret for JWT tokens      | -       |
| `MOCK_LEDGER`             | Skip blockchain operations | true    |

### Frontend

| Variable       | Description     | Default               |
| -------------- | --------------- | --------------------- |
| `VITE_API_URL` | Backend API URL | http://localhost:3001 |

---

## Blockchain Setup (Optional)

For full Hyperledger Fabric functionality:

1. **Install Fabric binaries**:

   ```bash
   cd src/ledger
   bash install-fabric.sh --fabric-version 2.5.10 binary
   ```

2. **Start the network**:

   ```bash
   cd legitify-network
   bash scripts/startNetwork.sh
   ```

3. **Update backend config**:
   Set `MOCK_LEDGER=false` in your server.env

---

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for production deployment instructions using Coolify.

---

## Troubleshooting

### Port conflicts

Update ports in `docker-compose.yml` or `.env` files

### Database connection issues

- Ensure PostgreSQL is running
- Check `POSTGRES_CONNECTION_URL` in server.env

### Docker resource limits

Allocate at least 4GB RAM to Docker for Fabric

### Clear everything and start fresh

```bash
docker compose down -v
docker system prune -af
docker compose up -d
```
