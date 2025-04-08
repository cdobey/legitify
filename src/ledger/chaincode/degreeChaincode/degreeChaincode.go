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
	DocID           string  `json:"docId"`
	DocHash         string  `json:"docHash"`
	Owner           string  `json:"owner"` // The individual's ID
	Issuer          string  `json:"issuer"`
	UniversityID    string  `json:"universityId"` // New field for university identity
	IssuedAt        string  `json:"issuedAt"`
	Accepted        bool    `json:"accepted"`
	Denied          bool    `json:"denied"`
	DegreeTitle     string  `json:"degreeTitle"`
	FieldOfStudy    string  `json:"fieldOfStudy"`
	GraduationDate  string  `json:"graduationDate"`
	Honors          string  `json:"honors"`
	StudentId       string  `json:"studentId"` 
	ProgramDuration string  `json:"programDuration"`
	GPA             float64 `json:"gpa"`
	AdditionalNotes string  `json:"additionalNotes"`
}

// Affiliation represents the university-student relationship
type Affiliation struct {
	UserID       string `json:"userId"`
	UniversityID string `json:"universityId"`
	Status       string `json:"status"`
}

type AccessGrant struct {
	DocID      string    `json:"docId"`
	RequestedBy string    `json:"requestedBy"`
	GrantedAt  string    `json:"grantedAt"`
}

// IssueDegree adds a new degree record to the ledger
func (dc *DegreeChaincode) IssueDegree(ctx contractapi.TransactionContextInterface, 
	docID, docHash, owner, issuer, universityId, degreeTitle, fieldOfStudy, graduationDate,
	honors, studentId, programDuration string, gpa float64, additionalNotes string) error {
	
	// Check if document already exists
	existing, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to check ledger: %v", err)
	}
	if len(existing) != 0 {
		return fmt.Errorf("document %s already exists", docID)
	}
	
	// Verify the affiliation between university and student
	// This validation would be done by the client-side application
	// but we could add composite keys in Fabric to enforce this as well
	
	// For now, we'll include the universityId in the record
	record := &DegreeRecord{
		DocID:           docID,
		DocHash:         docHash,
		Owner:           owner,
		Issuer:          issuer,
		UniversityID:    universityId,
		IssuedAt:        time.Now().UTC().Format(time.RFC3339),
		Accepted:        false,
		Denied:          false,
		DegreeTitle:     degreeTitle,
		FieldOfStudy:    fieldOfStudy,
		GraduationDate:  graduationDate,
		Honors:          honors,
		StudentId:       studentId,
		ProgramDuration: programDuration,
		GPA:             gpa,
		AdditionalNotes: additionalNotes,
	}
	data, _ := json.Marshal(record)
	
	// Create a composite key for university-based indexing
	uniDocKey, err := ctx.GetStub().CreateCompositeKey("university~doc", []string{universityId, docID})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}
	
	// Store the university index key
	if err := ctx.GetStub().PutState(uniDocKey, []byte{0}); err != nil {
		return fmt.Errorf("failed to put university index: %v", err)
	}
	
	// Store the main document record
	return ctx.GetStub().PutState(docID, data)
}

// Add a university affiliation key to the ledger
func (dc *DegreeChaincode) AddUniversityAffiliation(ctx contractapi.TransactionContextInterface, 
	userId string, universityId string) error {
	
	// Create a composite key for the affiliation
	affiliationKey, err := ctx.GetStub().CreateCompositeKey("affiliation", []string{userId, universityId})
	if err != nil {
		return fmt.Errorf("failed to create affiliation key: %v", err)
	}
	
	// Check if affiliation already exists
	existing, err := ctx.GetStub().GetState(affiliationKey)
	if err != nil {
		return fmt.Errorf("failed to check affiliation: %v", err)
	}
	if len(existing) != 0 {
		return fmt.Errorf("affiliation already exists")
	}
	
	// Create the affiliation
	affiliation := &Affiliation{
		UserID:       userId,
		UniversityID: universityId,
		Status:       "active",
	}
	data, _ := json.Marshal(affiliation)
	return ctx.GetStub().PutState(affiliationKey, data)
}

// Check if a user is affiliated with a university
func (dc *DegreeChaincode) CheckAffiliation(ctx contractapi.TransactionContextInterface, 
	userId string, universityId string) (bool, error) {
	
	// Create the composite key
	affiliationKey, err := ctx.GetStub().CreateCompositeKey("affiliation", []string{userId, universityId})
	if err != nil {
		return false, fmt.Errorf("failed to create affiliation key: %v", err)
	}
	
	// Check if the affiliation exists
	existing, err := ctx.GetStub().GetState(affiliationKey)
	if err != nil {
		return false, fmt.Errorf("failed to check affiliation: %v", err)
	}
	
	return len(existing) > 0, nil
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
        if (err != nil) {
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

// GetUniversityRecords retrieves all degree records for a specific university using composite keys
func (dc *DegreeChaincode) GetUniversityRecords(ctx contractapi.TransactionContextInterface, universityId string) ([]*DegreeRecord, error) {
    // Use composite key to efficiently query documents by university
    iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("university~doc", []string{universityId})
    if err != nil {
        return nil, fmt.Errorf("failed to get university records: %v", err)
    }
    defer iterator.Close()

    var records []*DegreeRecord
    for iterator.HasNext() {
        queryResult, err := iterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to get next record: %v", err)
        }
        
        // Extract the document ID from the composite key
        _, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(queryResult.Key)
        if err != nil {
            return nil, fmt.Errorf("failed to split composite key: %v", err)
        }
        
        if len(compositeKeyParts) < 2 {
            continue // Skip if we couldn't extract the document ID
        }
        
        docID := compositeKeyParts[1]
        
        // Get the actual document
        docBytes, err := ctx.GetStub().GetState(docID)
        if err != nil {
            return nil, fmt.Errorf("failed to get document %s: %v", docID, err)
        }
        
        // Skip if document doesn't exist (shouldn't happen, but just in case)
        if len(docBytes) == 0 {
            continue
        }
        
        var record DegreeRecord
        if err := json.Unmarshal(docBytes, &record); err != nil {
            return nil, fmt.Errorf("failed to unmarshal record: %v", err)
        }
        
        records = append(records, &record)
    }

    return records, nil
}

// GrantAccess records that a requester has been granted access to a document
func (dc *DegreeChaincode) GrantAccess(ctx contractapi.TransactionContextInterface, docID string, requesterId string) error {
	// Check if the document exists
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read document %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("document %s not found", docID)
	}

	// Create a composite key for the access grant
	accessKey, err := ctx.GetStub().CreateCompositeKey("access", []string{docID, requesterId})
	if err != nil {
		return fmt.Errorf("failed to create access key: %v", err)
	}

	// Create an access grant record
	accessGrant := &AccessGrant{
		DocID:      docID,
		RequestedBy: requesterId,
		GrantedAt:  time.Now().UTC().Format(time.RFC3339),
	}

	// Serialize and store the access grant
	grantData, err := json.Marshal(accessGrant)
	if err != nil {
		return fmt.Errorf("failed to marshal access grant: %v", err)
	}

	// Store the access grant
	if err := ctx.GetStub().PutState(accessKey, grantData); err != nil {
		return fmt.Errorf("failed to store access grant: %v", err)
	}

	return nil
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
