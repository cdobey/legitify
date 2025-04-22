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
  shorthand: string; // Changed from displayName to match backend
  description?: string;
  logoUrl?: string;
  ownerId: string;
  issuerType?: string;
  country?: string;
  address?: string;
  website?: string;
  foundedYear?: number;
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
  ledgerTimestamp?: string; // Renamed from issuanceDate to match backend
  achievementDate?: string;
  expirationDate?: string;
  programLength?: string; // Added to match backend
  domain?: string; // Added to match backend
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
