export interface Issuer {
  id: string;
  name: string;
  shorthand: string; // Changed from displayName to match backend
  description: string;
  logoUrl?: string;
  ownerId: string;
  issuerType?: string;
  country?: string;
  address?: string;
  website?: string;
  foundedYear?: number;
  owner?: {
    username: string;
  };
  affiliations?: Array<{
    id: string;
    userId: string;
    status: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }>;
  memberRole?: string;
}

export interface Affiliation {
  id: string;
  userId: string;
  issuerId: string;
  status: 'pending' | 'active' | 'rejected';
  initiatedBy?: 'holder' | 'issuer';
  createdAt: string;
  updatedAt?: string;
  issuer: Issuer;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CreateIssuerParams {
  name: string;
  shorthand: string; // Changed from displayName to match backend
  description?: string;
  logoUrl?: string;
  country?: string;
  address?: string;
  website?: string;
  foundedYear?: number;
}

export interface CreateIssuerResponse {
  message: string;
  issuer: Issuer;
}

export interface JoinIssuerParams {
  issuerId: string;
}

export interface AddHolderParams {
  issuerId: string;
  holderEmail: string;
}

export interface RegisterHolderParams {
  email: string;
  username: string;
  password: string;
  issuerId: string;
}

export interface RegisterHolderResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  affiliation: Affiliation;
}

export interface AffiliationResponseParams {
  affiliationId: string;
  accept: boolean;
}

export interface AffiliationResponse {
  message: string;
  affiliation: Affiliation;
}

export interface JoinRequestResponse {
  id: string;
  requesterId: string;
  issuerId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    username: string;
    email: string;
  };
  issuer: Issuer;
}

export interface JoinRequestResponseParams {
  requestId: string;
  accept: boolean;
}

export type JoinRequestsResponse = JoinRequestResponse[];

export type IssuersResponse = Issuer[];
export type AffiliationsResponse = Affiliation[];
