package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type CredentialChaincode struct {
	contractapi.Contract
}

type Credential struct {
	// Core attributes (common across all credential types)
	DocID           string            `json:"docId"`
	DocHash         string            `json:"docHash"`
	Type            string            `json:"type"`            // Type of credential (degree, certificate, badge, etc.)
	HolderID        string            `json:"holderId"`
	IssuerID        string            `json:"issuerId"`
	IssuerOrgID     string            `json:"issuerOrgId"`
	Accepted        bool              `json:"accepted"`
	Denied          bool              `json:"denied"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	LedgerTimestamp string            `json:"ledgerTimestamp"` // Immutable timestamp set by Fabric when issued
	AchievementDate string            `json:"achievementDate"`
	ExpirationDate  string            `json:"expirationDate"`
	ProgramLength   string            `json:"programLength"`   // Length of the program (e.g., "4 years")
	Domain          string            `json:"domain"`          // Field or area of the credential
	
	// Customizable additional attributes
	Attributes      map[string]string `json:"attributes"`      // Dynamic fields for credential-specific attributes
}

type IssuerHolderRelationship struct {
	HolderID  string `json:"holderId"`
	IssuerID  string `json:"issuerId"`
	Status    string `json:"status"`
}

type AccessGrant struct {
	DocID       string `json:"docId"`
	RequestedBy string `json:"requestedBy"`
	GrantedAt   string `json:"grantedAt"`
}

func (dc *CredentialChaincode) IssueCredential(ctx contractapi.TransactionContextInterface, 
	docID, docHash, holderID, issuerID, issuerOrgID, credType, title, description, 
	achievementDate, expirationDate, programLength, domain string, attributesJSON string) error {
	
	// Check if document already exists
	existing, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to check ledger: %v", err)
	}
	if len(existing) != 0 {
		return fmt.Errorf("credential %s already exists", docID)
	}
	
	// Parse the attributes from JSON
	var attributes map[string]string
	if err := json.Unmarshal([]byte(attributesJSON), &attributes); err != nil {
		return fmt.Errorf("failed to parse attributes JSON: %v", err)
	}
	
	// Get current timestamp from the ledger
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	
	// Format the ledger timestamp
	ledgerTimestamp := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	
	// Create the credential record
	credential := &Credential{
		DocID:           docID,
		DocHash:         docHash,
		Type:            credType,
		HolderID:        holderID,
		IssuerID:        issuerID,
		IssuerOrgID:     issuerOrgID,
		Accepted:        false,
		Denied:          false,
		Title:           title,
		Description:     description,
		LedgerTimestamp: ledgerTimestamp,
		AchievementDate: achievementDate,
		ExpirationDate:  expirationDate,
		ProgramLength:   programLength,
		Domain:          domain,
		Attributes:      attributes,
	}
	
	data, _ := json.Marshal(credential)
	
	// Create composite keys for organization-based indexing
	issuerDocKey, err := ctx.GetStub().CreateCompositeKey("issuer~doc", []string{issuerID, docID})
	if err != nil {
		return fmt.Errorf("failed to create issuer composite key: %v", err)
	}
	
	holderDocKey, err := ctx.GetStub().CreateCompositeKey("holder~doc", []string{holderID, docID})
	if err != nil {
		return fmt.Errorf("failed to create holder composite key: %v", err)
	}
	
	// Create composite key for issuer organization
	issuerOrgDocKey, err := ctx.GetStub().CreateCompositeKey("issuerOrg~doc", []string{issuerOrgID, docID})
	if err != nil {
		return fmt.Errorf("failed to create issuer org composite key: %v", err)
	}
	
	// Store the organization index keys
	if err := ctx.GetStub().PutState(issuerDocKey, []byte{0}); err != nil {
		return fmt.Errorf("failed to put issuer index: %v", err)
	}
	
	if err := ctx.GetStub().PutState(holderDocKey, []byte{0}); err != nil {
		return fmt.Errorf("failed to put holder index: %v", err)
	}
	
	if err := ctx.GetStub().PutState(issuerOrgDocKey, []byte{0}); err != nil {
		return fmt.Errorf("failed to put issuer org index: %v", err)
	}
	
	return ctx.GetStub().PutState(docID, data)
}

func (dc *CredentialChaincode) AddIssuerHolderRelationship(ctx contractapi.TransactionContextInterface, 
	holderID string, issuerID string) error {
	
	// Create a composite key for the relationship
	relationshipKey, err := ctx.GetStub().CreateCompositeKey("issuer-holder", []string{holderID, issuerID})
	if err != nil {
		return fmt.Errorf("failed to create relationship key: %v", err)
	}
	
	existing, err := ctx.GetStub().GetState(relationshipKey)
	if err != nil {
		return fmt.Errorf("failed to check relationship: %v", err)
	}
	if len(existing) != 0 {
		return fmt.Errorf("relationship already exists")
	}
	
	// Create the relationship
	relationship := &IssuerHolderRelationship{
		HolderID: holderID,
		IssuerID: issuerID,
		Status:   "active",
	}
	data, _ := json.Marshal(relationship)
	return ctx.GetStub().PutState(relationshipKey, data)
}

func (dc *CredentialChaincode) CheckIssuerHolderRelationship(ctx contractapi.TransactionContextInterface, 
	holderID string, issuerID string) (bool, error) {
	
	// Create the composite key
	relationshipKey, err := ctx.GetStub().CreateCompositeKey("issuer-holder", []string{holderID, issuerID})
	if err != nil {
		return false, fmt.Errorf("failed to create relationship key: %v", err)
	}
	
	// Check if the relationship exists
	existing, err := ctx.GetStub().GetState(relationshipKey)
	if err != nil {
		return false, fmt.Errorf("failed to check relationship: %v", err)
	}
	
	return len(existing) > 0, nil
}

func (dc *CredentialChaincode) AcceptCredential(ctx contractapi.TransactionContextInterface, docID string) error {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read credential %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("credential %s not found", docID)
	}

	var credential Credential
	if err := json.Unmarshal(data, &credential); err != nil {
		return fmt.Errorf("unmarshal error: %v", err)
	}

	credential.Accepted = true
	credential.Denied = false

	newData, _ := json.Marshal(credential)
	return ctx.GetStub().PutState(docID, newData)
}

func (dc *CredentialChaincode) DenyCredential(ctx contractapi.TransactionContextInterface, docID string) error {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read credential %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("credential %s not found", docID)
	}

	var credential Credential
	if err := json.Unmarshal(data, &credential); err != nil {
		return fmt.Errorf("unmarshal error: %v", err)
	}

	credential.Denied = true
	credential.Accepted = false

	newData, _ := json.Marshal(credential)
	return ctx.GetStub().PutState(docID, newData)
}

func (dc *CredentialChaincode) ReadCredential(ctx contractapi.TransactionContextInterface, docID string) (*Credential, error) {
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential: %v", err)
	}
	if len(data) == 0 {
		return nil, fmt.Errorf("credential %s not found", docID)
	}

	var credential Credential
	if err := json.Unmarshal(data, &credential); err != nil {
		return nil, fmt.Errorf("unmarshal error: %v", err)
	}
	return &credential, nil
}

// VerifyHash checks if the ledger's docHash matches a given hash
func (dc *CredentialChaincode) VerifyHash(ctx contractapi.TransactionContextInterface, docID, hashToCheck string) (bool, error) {
	credential, err := dc.ReadCredential(ctx, docID)
	if err != nil {
		return false, err
	}
	return (credential.DocHash == hashToCheck), nil
}

// GetAllCredentials retrieves all credentials from the ledger
func (dc *CredentialChaincode) GetAllCredentials(ctx contractapi.TransactionContextInterface) ([]*Credential, error) {
    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, fmt.Errorf("failed to get all credentials: %v", err)
    }
    defer resultsIterator.Close()

    var credentials []*Credential
    for resultsIterator.HasNext() {
        queryResult, err := resultsIterator.Next()
        if (err != nil) {
            return nil, fmt.Errorf("failed to get next credential: %v", err)
        }

        var credential Credential
        if err := json.Unmarshal(queryResult.Value, &credential); err != nil {
            // Skip if not a credential (could be an index or other data)
            continue
        }
        credentials = append(credentials, &credential)
    }

    return credentials, nil
}

func (dc *CredentialChaincode) GetIssuerCredentials(ctx contractapi.TransactionContextInterface, issuerOrgID string) ([]*Credential, error) {
    iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("issuerOrg~doc", []string{issuerOrgID})
    if err != nil {
        return nil, fmt.Errorf("failed to get issuer credentials: %v", err)
    }
    defer iterator.Close()

    var credentials []*Credential
    for iterator.HasNext() {
        queryResult, err := iterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to get next credential: %v", err)
        }
        
        // Extract the document ID from the composite key
        _, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(queryResult.Key)
        if err != nil {
            return nil, fmt.Errorf("failed to split composite key: %v", err)
        }
        
        if len(compositeKeyParts) < 2 {
            continue
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
        
        var credential Credential
        if err := json.Unmarshal(docBytes, &credential); err != nil {
            return nil, fmt.Errorf("failed to unmarshal credential: %v", err)
        }
        
        credentials = append(credentials, &credential)
    }

    return credentials, nil
}

func (dc *CredentialChaincode) GetHolderCredentials(ctx contractapi.TransactionContextInterface, holderID string) ([]*Credential, error) {
    // Use composite key to efficiently query documents by holder
    iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("holder~doc", []string{holderID})
    if err != nil {
        return nil, fmt.Errorf("failed to get holder credentials: %v", err)
    }
    defer iterator.Close()

    var credentials []*Credential
    for iterator.HasNext() {
        queryResult, err := iterator.Next()
        if err != nil {
            return nil, fmt.Errorf("failed to get next credential: %v", err)
        }
        
        // Extract the document ID from the composite key
        _, compositeKeyParts, err := ctx.GetStub().SplitCompositeKey(queryResult.Key)
        if err != nil {
            return nil, fmt.Errorf("failed to split composite key: %v", err)
        }
        
        if len(compositeKeyParts) < 2 {
            continue
        }
        
        docID := compositeKeyParts[1]
        
        docBytes, err := ctx.GetStub().GetState(docID)
        if err != nil {
            return nil, fmt.Errorf("failed to get document %s: %v", docID, err)
        }
        
        if len(docBytes) == 0 {
            continue
        }
        
        var credential Credential
        if err := json.Unmarshal(docBytes, &credential); err != nil {
            return nil, fmt.Errorf("failed to unmarshal credential: %v", err)
        }
        
        credentials = append(credentials, &credential)
    }

    return credentials, nil
}

func (dc *CredentialChaincode) GrantAccess(ctx contractapi.TransactionContextInterface, docID string, verifierID string) error {
	// Check if the document exists
	data, err := ctx.GetStub().GetState(docID)
	if err != nil {
		return fmt.Errorf("failed to read credential %s: %v", docID, err)
	}
	if len(data) == 0 {
		return fmt.Errorf("credential %s not found", docID)
	}

	// Create a composite key for the access grant
	accessKey, err := ctx.GetStub().CreateCompositeKey("access", []string{docID, verifierID})
	if err != nil {
		return fmt.Errorf("failed to create access key: %v", err)
	}

	// Create an access grant record
	accessGrant := &AccessGrant{
		DocID:       docID,
		RequestedBy: verifierID,
		GrantedAt:   time.Now().UTC().Format(time.RFC3339),
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
	chaincode, err := contractapi.NewChaincode(new(CredentialChaincode))
	if err != nil {
		panic(fmt.Sprintf("Error create credential chaincode: %v", err))
	}

	// Check if running as CCaaS (Chaincode as a Service)
	ccid := os.Getenv("CHAINCODE_ID")
	ccAddress := os.Getenv("CHAINCODE_SERVER_ADDRESS")
	
	if ccid != "" && ccAddress != "" {
		// Running as external chaincode service
		server := &shim.ChaincodeServer{
			CCID:    ccid,
			Address: ccAddress,
			CC:      chaincode,
			TLSProps: shim.TLSProperties{
				Disabled: true,
			},
		}
		if err := server.Start(); err != nil {
			panic(fmt.Sprintf("Error starting chaincode server: %v", err))
		}
	} else {
		// Running in traditional embedded mode
		if err := chaincode.Start(); err != nil {
			panic(fmt.Sprintf("Error starting credential chaincode: %v", err))
		}
	}
}
