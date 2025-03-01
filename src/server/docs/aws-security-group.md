# AWS Security Group Configuration for Hyperledger Fabric Network

## Inbound Rules

Ensure the following ports are open in your EC2 instance's security group:

### API and Resource Server Ports

| Port | Protocol | Description            |
| ---- | -------- | ---------------------- |
| 3001 | TCP      | Express API Server     |
| 8080 | TCP      | Fabric Resource Server |

### Hyperledger Fabric Peer Ports

| Port | Protocol | Description                |
| ---- | -------- | -------------------------- |
| 7051 | TCP      | OrgUniversity peer service |
| 8051 | TCP      | OrgEmployer peer service   |
| 9051 | TCP      | OrgIndividual peer service |

### Hyperledger Fabric Orderer Ports

| Port | Protocol | Description              |
| ---- | -------- | ------------------------ |
| 7050 | TCP      | Orderer service          |
| 7053 | TCP      | Orderer admin endpoint 1 |
| 7055 | TCP      | Orderer admin endpoint 2 |
| 7057 | TCP      | Orderer admin endpoint 3 |
| 7059 | TCP      | Orderer admin endpoint 4 |

### Hyperledger Fabric CA Ports

| Port  | Protocol | Description              |
| ----- | -------- | ------------------------ |
| 7054  | TCP      | OrgUniversity CA         |
| 8054  | TCP      | OrgEmployer CA           |
| 9054  | TCP      | OrgIndividual CA         |
| 17054 | TCP      | CA operations endpoint 1 |
| 18054 | TCP      | CA operations endpoint 2 |
| 19054 | TCP      | CA operations endpoint 3 |

### Chaincode Ports

| Port | Protocol | Description                      |
| ---- | -------- | -------------------------------- |
| 7052 | TCP      | OrgUniversity chaincode listener |
| 8052 | TCP      | OrgEmployer chaincode listener   |
| 9052 | TCP      | OrgIndividual chaincode listener |

### Monitoring Ports (if using)

| Port | Protocol | Description |
| ---- | -------- | ----------- |
| 9090 | TCP      | Prometheus  |
| 3000 | TCP      | Grafana     |

## Important Notes

1. These ports should only be accessible from trusted IP addresses to ensure security.
2. For production, consider using VPC peering or VPN connections instead of opening ports publicly.
3. SSH (port 22) should also be enabled for EC2 instance administration.
4. Make sure to restrict access to the Resource Server (port 8080) to only your application servers or development machines.
