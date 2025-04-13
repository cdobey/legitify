export interface University {
  id: string;
  name: string;
  displayName: string;
  description: string;
  logoUrl?: string;
  ownerId: string;
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
}

export interface Affiliation {
  id: string;
  userId: string;
  universityId: string;
  status: 'pending' | 'active' | 'rejected';
  initiatedBy?: 'student' | 'university';
  createdAt: string;
  university: University;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CreateUniversityParams {
  name: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
}

export interface CreateUniversityResponse {
  message: string;
  university: University;
}

export interface JoinUniversityParams {
  universityId: string;
}

export interface AddStudentParams {
  universityId: string;
  studentEmail: string;
}

export interface RegisterStudentParams {
  email: string;
  username: string;
  password: string;
  universityId: string;
}

export interface RegisterStudentResponse {
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

export type UniversitiesResponse = University[];
export type AffiliationsResponse = Affiliation[];
