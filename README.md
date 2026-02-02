# Legitify

Legitify is a credential issuance and verification platform. Issuers create credentials, holders control access, and verifiers can confirm authenticity. The ledger integration is optional; the database is the source of truth for users and application state, while Fabric provides tamper-evident records.

## Features

- Secure credential issuance with issuer/member controls
- Holder-managed access grants
- Verifier lookup with hash checks
- Optional Hyperledger Fabric ledger for immutability
- React frontend + Express/Prisma backend

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│  (React/Vite)   │     │  (Node/Express) │     │   (Database)    │
│                 │     │                 │     │                 │
│ legitify.dobey  │     │ api-legitify.   │     │   (Internal)    │
│     .dev        │     │   dobey.dev     │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Hyperledger    │
                        │    Fabric       │
                        │  (Optional)     │
                        └─────────────────┘
```

## Data model (high level)

- **User**: issuer/holder/verifier accounts
- **Issuer**: organization metadata and membership
- **Credential**: stored in DB, optionally mirrored to ledger
- **Request**: access requests and grants
- **WalletIdentity**: Fabric identities stored in DB

## Ledger behavior

- `MOCK_LEDGER=true` bypasses Fabric calls but keeps application flows working.
- When Fabric is enabled, credentials are issued on-chain and status updates are recorded.
- Wallet identities are derived from cryptogen admin identities and stored in Postgres.

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/legitify.git
cd legitify

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

Access:

- Frontend: http://localhost
- API: http://localhost:3001
- API Docs: http://localhost:3001/docs

## Local Development

See `src/README.md` for local setup, scripts, and environment variables.

## Deployment

Production is split into services (frontend, backend, database, Fabric compose). Notes live in `DEPLOYMENT.md`.

## Tech Stack

| Component  | Technology                             |
| ---------- | -------------------------------------- |
| Frontend   | React 18, Vite, Mantine UI, TypeScript |
| Backend    | Node.js 18, Express, Prisma ORM        |
| Database   | PostgreSQL 15                          |
| Blockchain | Hyperledger Fabric 2.5 (optional)      |
| CI/CD      | GitHub Actions                         |
| Registry   | GitHub Container Registry (ghcr.io)    |

## Project Structure

```
legitify/
├── .github/workflows/           # GitHub Actions CI/CD
├── src/
│   ├── client/                  # React frontend
│   ├── server/                  # Node.js backend
│   └── ledger/                  # Hyperledger Fabric configs + chaincode
├── docker-compose.yml           # Local development
├── docker-compose.coolify.yml   # Fabric-only deployment for Coolify
├── DEPLOYMENT.md                # Deployment notes
└── README.md
```

## Development

```bash
# Run tests
cd src/server && npm test
cd src/client && npm test

# Build Docker images locally
docker compose build
```

## License

MIT License. See `LICENSE` for details.
