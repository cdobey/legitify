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