package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// DegreeChaincode implements the chaincode logic
type DegreeChaincode struct {
	contractapi.Contract
}

// DegreeRecord represents data stored on the ledger
type DegreeRecord struct {
	DocID       string    `json:"docId"`
	DocHash     string    `json:"docHash"`
	Owner       string    `json:"owner"` // The individual's ID
	Issuer      string    `json:"issuer"`
	IssuedAt    string    `json:"issuedAt"`
	Accepted    bool      `json:"accepted"`
	Denied      bool      `json:"denied"`
}

// IssueDegree adds a new degree record to the ledger
func (dc *DegreeChaincode) IssueDegree(ctx contractapi.TransactionContextInterface, docID, docHash, owner, issuer string) error {
	existing, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to check ledger: %v", err)
	}
	if len(existing) != 0 {
		return fmt.Errorf("document %s already exists", docID)
	}

	record := &DegreeRecord{
		DocID:    docID,
		DocHash:  docHash,
		Owner:    owner,
		Issuer:   issuer,
		IssuedAt: time.Now().UTC().Format(time.RFC3339),
		Accepted: false,
		Denied:   false,
	}
	data, _ := json.Marshal(record)
	return ctx.GetStub().PutState(docID, data)
}

// AcceptDegree marks the record as accepted by the individual
func (dc *DegreeChaincode) AcceptDegree(ctx contractapi.TransactionContextInterface, docID string) error {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read doc %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("doc %s not found", docID)
	}

	var record DegreeRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return fmt.Errorf("unmarshal error: %v", err)
	}

	record.Accepted = true
	record.Denied = false

	newData, _ := json.Marshal(record)
	return ctx.GetStub().PutState(docID, newData)
}

// DenyDegree marks the record as denied
func (dc *DegreeChaincode) DenyDegree(ctx contractapi.TransactionContextInterface, docID string) error {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read doc %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("doc %s not found", docID)
	}

	var record DegreeRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return fmt.Errorf("unmarshal error: %v", err)
	}

	record.Denied = true
	record.Accepted = false

	newData, _ := json.Marshal(record)
	return ctx.GetStub().PutState(docID, newData)
}

// ReadDegree retrieves the record
func (dc *DegreeChaincode) ReadDegree(ctx contractapi.TransactionContextInterface, docID string) (*DegreeRecord, error) {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return nil, fmt.Errorf("failed to read doc: %v", err)
	}
	if len(data) == 0 {
		return nil, fmt.Errorf("doc %s not found", docID)
	}

	var record DegreeRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("unmarshal error: %v", err)
	}
	return &record, nil
}

// VerifyHash checks if the ledger's docHash matches a given hash
func (dc *DegreeChaincode) VerifyHash(ctx contractapi.TransactionContextInterface, docID, hashToCheck string) (bool, error) {
	record, err := dc.ReadDegree(ctx, docID)
	if err != nil {
		return false, err
	}
	return (record.DocHash == hashToCheck), nil
}

// GetAllRecords retrieves all degree records from the ledger
func (dc *DegreeChaincode) GetAllRecords(ctx contractapi.TransactionContextInterface) ([]*DegreeRecord, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get all records: %v", err)
    }
    defer resultsIterator.Close()

    var records []*DegreeRecord
    for resultsIterator.HasNext() {
        queryResult, err := resultsIterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to get next record: %v", err)
        }

        var record DegreeRecord
        if err := json.Unmarshal(queryResult.Value, &record); err != nil {
            return nil, fmt.Errorf("failed to unmarshal record: %v", err)
        }
        records = append(records, &record)
    }

    return records, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(DegreeChaincode))
	if err != nil {
		panic(fmt.Sprintf("Error create degree chaincode: %v", err))
	}

	if err := chaincode.Start(); err != nil {
		panic(fmt.Sprintf("Error starting degree chaincode: %v", err))
	}
}
