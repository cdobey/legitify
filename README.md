# Legitify

A blockchain-based credential verification platform that enables secure issuance, management, and verification of digital credentials.

## Features

- 🔐 **Secure Credential Issuance** - Organizations can issue tamper-proof digital credentials
- ✅ **Instant Verification** - Verify credentials in real-time against the blockchain
- 👤 **User-Controlled** - Holders maintain full control over their credentials
- 🔗 **Blockchain-Backed** - Optional Hyperledger Fabric integration for immutability
- 🌐 **Modern Web Stack** - React frontend with Node.js/Express backend

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

## Quick Start

### Using Docker (Recommended)

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

### Manual Setup

See [src/README.md](src/README.md) for detailed development instructions.

## Deployment

Legitify is designed for deployment on Coolify. See [DEPLOYMENT.md](DEPLOYMENT.md) for:

- Complete deployment instructions
- Environment variable reference
- DNS configuration
- Security checklist

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
├── .github/workflows/     # GitHub Actions CI/CD
├── docs/                  # Documentation
├── src/
│   ├── client/           # React frontend
│   ├── server/           # Node.js backend
│   └── ledger/           # Hyperledger Fabric
├── docker-compose.yml     # Local development
├── docker-compose.coolify.yml  # Fabric-only deployment for Coolify
└── DEPLOYMENT.md         # Deployment guide
```

## Development

```bash
# Run tests
cd src/server && npm test
cd src/client && npm test

# Build Docker images locally
docker compose build

# Format code
npm run format
```

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
