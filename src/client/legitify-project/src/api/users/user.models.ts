export type UserRole = 'issuer' | 'holder' | 'verifier';

export enum OrgName {
  orgissuer = 'orgissuer',
  orgholder = 'orgholder',
  orgverifier = 'orgverifier',
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  role: UserRole;
  orgName: OrgName;
  profilePictureUrl?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerUserResponse {
  uid: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  role?: UserRole;
  orgName?: OrgName;
  profilePictureUrl?: string;
}

// Two-factor authentication state
export interface TwoFactorState {
  required: boolean;
  tempToken?: string;
  userId?: string;
  email?: string;
  password?: string;
}

// Two-factor authentication request/response types
export interface TwoFactorVerifyRequest {
  secret: string;
  token: string;
}

export interface TwoFactorDisableRequest {
  token: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
}

// Issuer model matching backend
export interface Issuer {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  issuerType?: string;
  createdAt: string;
  updatedAt: string;
}

// Credential model matching backend and blockchain
export interface Credential {
  id: string;
  docId: string;
  docHash: string;
  type: string;
  holderId: string;
  issuerId: string;
  issuerOrgId: string;
  title: string;
  description?: string;
  status: CredentialStatus;
  issuanceDate: string;
  expirationDate?: string;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Enum for credential status
export enum CredentialStatus {
  issued = 'issued',
  accepted = 'accepted',
  denied = 'denied',
}

// Additional types for relationships
export interface IssuerAffiliation {
  id: string;
  userId: string;
  issuerId: string;
  status: 'pending' | 'active' | 'rejected';
  initiatedBy: 'holder' | 'issuer';
  createdAt: string;
  updatedAt: string;
}

export interface IssuerMember {
  id: string;
  userId: string;
  issuerId: string;
  role: string;
  status: 'pending' | 'active' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
