import { apiCall } from '../apiCall';
import {
  AccessibleCredentialsResponse,
  AccessRequestsResponse,
  CredentialDetails,
  CredentialDocument,
  CredentialDocumentsResponse,
  CredentialResponse,
  LedgerRecord,
  VerificationResult,
} from './credential.models';

export const getMyCredentials = () =>
  apiCall<CredentialDocumentsResponse>({ method: 'get', path: '/credential/list' });

export const issueCredential = (details: CredentialDetails) =>
  apiCall<CredentialResponse>({
    method: 'post',
    path: '/credential/issue',
    params: {
      email: details.email,
      base64File: details.base64File,
      title: details.title,
      description: details.description,
      achievementDate: details.achievementDate,
      expirationDate: details.expirationDate,
      programLength: details.programLength,
      domain: details.domain,
      type: details.type,
      attributes: details.attributes || {},
      issuerOrgId: details.issuerOrgId,
    },
  });

export const verifyCredential = (email: string, base64File: string) =>
  apiCall<VerificationResult>({
    method: 'post',
    path: '/credential/verify',
    params: { email, base64File },
  });

export const acceptCredential = (docId: string) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/credential/accept',
    params: { docId },
  });

export const denyCredential = (docId: string) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/credential/deny',
    params: { docId },
  });

export const getAccessRequests = () =>
  apiCall<AccessRequestsResponse>({
    method: 'get',
    path: '/credential/requests',
  });

export const requestAccess = (docId: string) =>
  apiCall<{ message: string; requestId: string }>({
    method: 'post',
    path: '/credential/requestAccess',
    params: { docId },
  });

export const grantAccess = ({ requestId, granted }: { requestId: string; granted: boolean }) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/credential/grantAccess',
    params: { requestId, granted },
  });

export const viewCredential = (docId: string) =>
  apiCall<CredentialDocument>({
    method: 'get',
    path: `/credential/view/${docId}`,
  });

export const getUserCredentials = (userId: string) =>
  apiCall<CredentialDocumentsResponse>({
    method: 'get',
    path: `/credential/user/${userId}`,
  });

export const getAccessibleCredentials = () =>
  apiCall<AccessibleCredentialsResponse>({
    method: 'get',
    path: '/credential/accessible',
  });

export const getRecentIssuedCredentials = () =>
  apiCall<CredentialDocumentsResponse>({
    method: 'get',
    path: '/credential/recent-issued',
  });

export const getAllLedgerRecords = () =>
  apiCall<LedgerRecord[]>({
    method: 'get',
    path: '/credential/ledger/all',
  });

// Legacy aliases for backward compatibility
export const getMyDegrees = getMyCredentials;
export const issueDegree = issueCredential;
export const verifyDegree = verifyCredential;
export const getAccessibleDegrees = getAccessibleCredentials;
export const getRecentIssuedDegrees = getRecentIssuedCredentials;
