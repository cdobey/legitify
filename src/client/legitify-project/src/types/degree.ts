export interface Degree {
  docId: string;
  status: string;
  issueDate: string;
  issuer?: string;
}

export interface VerificationResponse {
  verified: boolean;
  message: string;
  docId?: string;
}
