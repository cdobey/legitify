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

export interface DegreeDocument {
  docId: string;
  issuer: string;
  status: string;
  issueDate: string;
  verified?: boolean;
  issuedAt?: string;
  verificationHash?: string;

  // Academic information
  degreeTitle?: string;
  fieldOfStudy?: string;
  graduationDate?: string;
  honors?: string;
  studentId?: string;
  programDuration?: string;
  gpa?: number | null;
  additionalNotes?: string | null;

  // University information
  universityInfo?: {
    name: string;
    displayName: string;
    description?: string;
  } | null;

  // Owner information
  owner?: {
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

export type DegreeDocumentsResponse = DegreeDocument[];

export interface DegreeResponse {
  docId: string;
  docHash: string;
}

export interface VerificationResult {
  verified: boolean;
  message: string;
  docId?: string;
  details?: {
    studentName?: string;
    university?: string;
    degreeTitle?: string;
    graduationDate?: string;
    issuer?: string;
    issuedAt?: string;
  };
}

export interface AccessRequest {
  requestId: string;
  docId: string;
  employerName: string;
  requestDate: string;
  status: 'pending' | 'granted' | 'denied';
}

export type AccessRequestsResponse = AccessRequest[];

export interface AccessibleDegree {
  requestId: string;
  docId: string;
  issuer: string;
  owner: {
    name: string;
    email: string;
  };
  status: string;
  dateGranted: string;
}

export type AccessibleDegreesResponse = AccessibleDegree[];

export interface DegreeDetails {
  email: string;
  base64File: string;
  degreeTitle: string;
  fieldOfStudy: string;
  graduationDate: string;
  honors: string;
  studentId: string;
  programDuration: string;
  gpa: number;
  additionalNotes?: string;
  universityId: string;
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
  owner: string;
  issuer: string;
  universityId: string;
  issuedAt: string;
  accepted: boolean;
  denied: boolean;
  degreeTitle: string;
  fieldOfStudy: string;
  graduationDate: string;
  honors: string;
  studentId: string;
  programDuration: string;
  gpa: number;
  additionalNotes: string;
  universityName: string;
}
