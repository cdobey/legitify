package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// DegreeContract provides functions for managing degrees
type DegreeContract struct {
	contractapi.Contract
}

// Degree describes basic details of what makes up a degree
type Degree struct {
	DegreeID      string `json:"degreeId"`
	DegreeHash    string `json:"degreeHash"`
	OwnerAccepted bool   `json:"ownerAccepted"`
	Timestamp     string `json:"timestamp"`  // Changed to string to ensure consistency
}

// InitLedger adds a base set of degrees to the ledger
func (s *DegreeContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Initializing the ledger with test data (optional)")
	return nil
}

// IssueDegree issues a new degree to the world state with given details
func (s *DegreeContract) IssueDegree(ctx contractapi.TransactionContextInterface, degreeID string, degreeHash string) error {
	// Input validation
	if len(degreeID) == 0 {
		return fmt.Errorf("degreeID cannot be empty")
	}
	if len(degreeHash) == 0 {
		return fmt.Errorf("degreeHash cannot be empty")
	}

	// Check if the degree already exists
	existing, err := ctx.GetStub().GetState(degreeID)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("degree with ID %s already exists", degreeID)
	}

	// Get transaction timestamp from the header
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}

	// Create degree object with deterministic timestamp
	degree := Degree{
		DegreeID:      degreeID,
		DegreeHash:    degreeHash,
		OwnerAccepted: false,
		Timestamp:     fmt.Sprintf("%d.%09d", txTimestamp.Seconds, txTimestamp.Nanos),
	}

	// Marshal degree to JSON
	degreeJSON, err := json.Marshal(degree)
	if err != nil {
		return fmt.Errorf("failed to marshal degree: %v", err)
	}

	// Put the degree in the world state
	err = ctx.GetStub().PutState(degreeID, degreeJSON)
	if err != nil {
		return fmt.Errorf("failed to put degree in world state: %v", err)
	}

	// Emit an event for the new degree
	err = ctx.GetStub().SetEvent("DegreeIssued", degreeJSON)
	if err != nil {
		return fmt.Errorf("failed to emit DegreeIssued event: %v", err)
	}

	return nil
}

// AcceptDegree marks a degree as accepted by the individual
func (s *DegreeContract) AcceptDegree(ctx contractapi.TransactionContextInterface, degreeID string) error {
	// Input validation
	if len(degreeID) == 0 {
		return fmt.Errorf("degreeID cannot be empty")
	}

	// Get the degree from world state
	degree, err := s.ReadDegree(ctx, degreeID)
	if err != nil {
		return err
	}

	// Check if degree is already accepted
	if degree.OwnerAccepted {
		return fmt.Errorf("degree %s is already accepted", degreeID)
	}

	// Update acceptance status
	degree.OwnerAccepted = true

	// Marshal degree to JSON
	degreeJSON, err := json.Marshal(degree)
	if err != nil {
		return fmt.Errorf("failed to marshal degree: %v", err)
	}

	// Update world state
	err = ctx.GetStub().PutState(degreeID, degreeJSON)
	if err != nil {
		return fmt.Errorf("failed to update degree in world state: %v", err)
	}

	// Emit an event for degree acceptance
	err = ctx.GetStub().SetEvent("DegreeAccepted", degreeJSON)
	if err != nil {
		return fmt.Errorf("failed to emit DegreeAccepted event: %v", err)
	}

	return nil
}

// ReadDegree returns the degree stored in the world state with given id
func (s *DegreeContract) ReadDegree(ctx contractapi.TransactionContextInterface, degreeID string) (*Degree, error) {
	// Input validation
	if len(degreeID) == 0 {
		return nil, fmt.Errorf("degreeID cannot be empty")
	}

	// Get degree from world state
	degreeJSON, err := ctx.GetStub().GetState(degreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if degreeJSON == nil {
		return nil, fmt.Errorf("degree %s does not exist", degreeID)
	}

	// Unmarshal degree
	var degree Degree
	err = json.Unmarshal(degreeJSON, &degree)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal degree JSON: %v", err)
	}

	return &degree, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&DegreeContract{})
	if err != nil {
		fmt.Printf("Error creating degree chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting degree chaincode: %s", err.Error())
	}
}