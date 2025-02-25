export interface DegreeDocument {
  docId: string;
  issuer: string;
  issuedTo: string;
  status: "issued" | "accepted" | "denied";
  issueDate: string;
  fileData?: string;
}

export interface VerificationResult {
  verified: boolean;
  message: string;
  docId?: string;
}

export interface AccessRequest {
  requestId: string;
  docId: string;
  employerName: string;
  requestDate: string;
  status: "pending" | "granted" | "denied";
}

export interface IssueResponse {
  docId: string;
  docHash: string;
}

export interface User {
  uid: string;
  email: string;
  orgName: string;
}

export interface DirectVerificationPayload {
  individualId: string;
  base64File: string;
}

export interface VerificationResult {
  verified: boolean;
  message: string;
  docId?: string;
}
