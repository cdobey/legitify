# **Step-by-Step Guide to Recreate Hyperledger Fabric Network**

This guide provides the steps and necessary shell scripts to recreate the Hyperledger Fabric network and test the degree issuance workflow with endorsements from two organizations.

---

## **1. Prerequisites**

Ensure the following tools are installed:

- Docker and Docker Compose
- Node.js and npm
- jq and curl
- Go (1.17 or later)

---

## **2. Directory Structure**

All files and directories should be organized as follows:

```
project-root/
├── chaincode/
│   └── degreeChaincode/
│       ├── go.mod
│       ├── go.sum
│       ├── degreeChaincode.go
├── organizations/
│   ├── peerOrganizations/
│   └── ordererOrganizations/
├── scripts/
│   ├── startNetwork.sh
│   ├── invokeDegree.sh
│   ├── queryDegree.sh
│   ├── validateDegree.sh
├── .env
└── network.sh
```

---

## **3. Setup Scripts**

### **3.1 Initialize Go Project**

Before deploying the chaincode, ensure the Go project is properly initialized:

1. Navigate to the chaincode directory:

```bash
cd chaincode/degreeChaincode/
```

2. Initialize the Go module:

```bash
go mod init degreeChaincode
```

3. Tidy dependencies:

```bash
go mod tidy
```

4. Verify dependencies are installed:

```bash
go build
```

---

### **3.2 Environment Variables File: `.env`**

```bash
# General Settings
FABRIC_CFG_PATH=$(pwd)/../config/

# Org1 Variables
ORG1_MSPID="Org1MSP"
ORG1_TLS_ENABLED=true
ORG1_TLS_CERT=$(pwd)/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem
ORG1_MSP_PATH=$(pwd)/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
ORG1_ADDRESS=localhost:7051

# Org2 Variables
ORG2_MSPID="Org2MSP"
ORG2_TLS_ENABLED=true
ORG2_TLS_CERT=$(pwd)/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem
ORG2_MSP_PATH=$(pwd)/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
ORG2_ADDRESS=localhost:9051

# Orderer Settings
ORDERER_CA=$(pwd)/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
```

---

### **3.3 Script: `startNetwork.sh`**

```bash
#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

# Bring down any existing network
echo "Shutting down existing network..."
./network.sh down

# Start the network with certificate authorities
echo "Starting network..."
./network.sh up createChannel -ca

# Deploy the chaincode
echo "Deploying chaincode..."
./network.sh deployCC -ccn degreeCC -ccp ../chaincode/degreeChaincode/ -ccl go

# Confirm setup success
echo "Network setup complete."
```

---

### **3.4 Script: `invokeDegree.sh`**

```bash
#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

peer chaincode invoke -o localhost:7050 --tls --cafile $ORDERER_CA \
-C mychannel -n degreeCC \
--peerAddresses $ORG1_ADDRESS --tlsRootCertFiles $ORG1_TLS_CERT \
--peerAddresses $ORG2_ADDRESS --tlsRootCertFiles $ORG2_TLS_CERT \
-c '{"Args":["IssueDegree","1","UniversityXYZ","John Doe","Bachelor of Science","2024-01-01"]}'

echo "Degree issued successfully."
```

---

### **3.5 Script: `queryDegree.sh`**

```bash
#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ReadDegree","1"]}'
```

---

### **3.6 Script: `validateDegree.sh`**

```bash
#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ValidateDegree","1"]}'
```

---

## **4. Chaincode: `degreeChaincode.go`**

### **4.1 Chaincode File Location:**

```
project-root/chaincode/degreeChaincode/degreeChaincode.go
```

### **4.2 Required Go Files**

- `go.mod`

```go
module degreeChaincode

go 1.17

require github.com/hyperledger/fabric-contract-api-go v1.1.0
```

- `go.sum` will be generated automatically when running `go mod tidy`.

### **4.3 Chaincode Implementation:**

```go
package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Degree structure
type Degree struct {
	ID         string `json:"ID"`
	University string `json:"University"`
	Recipient  string `json:"Recipient"`
	Title      string `json:"Title"`
	IssueDate  string `json:"IssueDate"`
}

// SmartContract for managing degrees
type SmartContract struct {
	contractapi.Contract
}

// IssueDegree issues a degree
func (s *SmartContract) IssueDegree(ctx contractapi.TransactionContextInterface, id string, university string, recipient string, title string, issueDate string) error {
	degree := Degree{
		ID:         id,
		University: university,
		Recipient:  recipient,
		Title:      title,
		IssueDate:  issueDate,
	}

	degreeJSON, err := json.Marshal(degree)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, degreeJSON)
}

// ReadDegree retrieves a degree
func (s *SmartContract) ReadDegree(ctx contractapi.TransactionContextInterface, id string) (*Degree, error) {
	degreeJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if degreeJSON == nil {
		return nil, fmt.Errorf("degree not found")
	}

	var degree Degree
	err = json.Unmarshal(degreeJSON, &degree)
	if err != nil {
		return nil, err
	}

	return &degree, nil
}

// ValidateDegree checks the existence of a degree
func (s *SmartContract) ValidateDegree(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	degreeJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, err
	}
	return degreeJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v", err)
	}
}
```

---

## **5. Usage Instructions**

### **5.1 Start the Network**

```bash
bash scripts/startNetwork.sh
```

### **5.2 Issue a Degree**

```bash
bash scripts/invokeDegree.sh
```

### **5.3 Query the Degree**

```bash
bash scripts/queryDegree.sh
```

### **5.4 Validate the Degree**

```bash
bash scripts/validateDegree.sh
```
