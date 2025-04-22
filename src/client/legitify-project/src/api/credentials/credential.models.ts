export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: PaginationMetadata;
}

export interface CredentialDocument {
  docId: string;
  issuer: string;
  status: string;
  issueDate: string;
  verified?: boolean;
  ledgerTimestamp?: string;
  achievementDate?: string;
  verificationHash?: string;

  // Holder information
  issuedTo?: string;
  recipientName?: string;

  // Credential information
  title?: string;
  description?: string;
  type?: string;
  programLength?: string;
  domain?: string;
  attributes?: {
    [key: string]: any;
  };

  // Issuer information
  issuerInfo?: {
    name: string;
    displayName: string;
    description?: string;
    logoUrl?: string;
  } | null;

  issuerId?: string;
  issuerOrgId?: string;

  // Owner information
  holder?: {
    name: string;
    email: string;
  };

  // Blockchain information
  blockchainInfo?: {
    recordCreated: string;
    txId: string;
    lastUpdated?: string;
  };

  // File data
  fileData?: string;

  // Access information
  accessGrantedOn?: string;
}

export type CredentialDocumentsResponse = CredentialDocument[];

export interface CredentialResponse {
  docId: string;
  docHash: string;
}

export interface VerificationResult {
  verified: boolean;
  message: string;
  credentialId?: string;
  fileData?: string;
  details?: {
    holderName?: string;
    issuer?: string;
    title?: string;
    description?: string;
    type?: string;
    attributes?: Record<string, any>;
    issuanceDate?: string;
    issuedAt?: string;
    issuerLogoUrl?: string;
    issuerId?: string;
    ledgerTimestamp?: string;
  };
}

export interface AccessRequest {
  requestId: string;
  docId: string;
  verifierName: string;
  requestDate: string;
  status: 'pending' | 'granted' | 'denied';
}

export type AccessRequestsResponse = AccessRequest[];

export interface AccessibleCredential {
  requestId: string;
  credentialId: string;
  title?: string;
  type?: string;
  issuer: string;
  holder: {
    name: string;
    email: string;
  };
  status: 'pending' | 'granted' | 'denied';
  requestedAt: string;
  dateGranted: string | null;
}

export type AccessibleCredentialsResponse = AccessibleCredential[];

export interface CredentialDetails {
  email: string;
  base64File: string;
  title: string;
  description: string;
  achievementDate?: string;
  expirationDate?: string;
  programLength?: string;
  domain?: string;
  type: string;
  attributes?: Record<string, any>;
  issuerOrgId: string;
}

export interface GrantAccessParams {
  requestId: string;
  granted: boolean;
}

export interface RequestAccessResponse {
  message: string;
  requestId: string;
}

export interface ActionResponse {
  message: string;
}

export interface LedgerRecord {
  docId: string;
  docHash: string;
  holderId: string;
  holderEmail?: string;
  issuerId: string;
  issuerOrgId: string;
  issuerName: string;
  ledgerTimestamp: string;
  achievementDate?: string;
  programLength?: string;
  domain?: string;
  accepted: boolean;
  denied: boolean;
  title: string;
  description: string;
  type: string;
  attributes?: Record<string, any>;
}

// Legacy alias types for backward compatibility
export type DegreeDocument = CredentialDocument;
export type DegreeDocumentsResponse = CredentialDocumentsResponse;
export type DegreeResponse = CredentialResponse;
export type DegreeDetails = CredentialDetails;
export type AccessibleDegreesResponse = AccessibleCredentialsResponse;
