import apiCall from '../apiCall';
import {
  AccessibleDegreesResponse,
  AccessRequestsResponse,
  DegreeDetails,
  DegreeDocument,
  DegreeDocumentsResponse,
  DegreeResponse,
  VerificationResult,
} from './degree.models';
// Import User from user.models instead
import { User } from '../users/user.models';

export const getMyDegrees = () =>
  apiCall<DegreeDocumentsResponse>({ method: 'get', path: '/degree/list' });

export const issueDegree = (details: DegreeDetails) =>
  apiCall<DegreeResponse>({
    method: 'post',
    path: '/degree/issue',
    params: details,
  });

export const verifyDegree = (email: string, base64File: string) =>
  apiCall<VerificationResult>({
    method: 'post',
    path: '/degree/verify',
    params: { email, base64File },
  });

export const acceptDegree = (docId: string) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/degree/accept',
    params: { docId },
  });

export const denyDegree = (docId: string) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/degree/deny',
    params: { docId },
  });

export const getAccessRequests = () =>
  apiCall<AccessRequestsResponse>({
    method: 'get',
    path: '/degree/requests',
  });

export const requestAccess = (docId: string) =>
  apiCall<{ message: string; requestId: string }>({
    method: 'post',
    path: '/degree/requestAccess',
    params: { docId },
  });

export const grantAccess = ({ requestId, granted }: { requestId: string; granted: boolean }) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/degree/grantAccess',
    params: { requestId, granted },
  });

export const viewDegree = (docId: string) =>
  apiCall<DegreeDocument>({
    method: 'get',
    path: `/degree/view/${docId}`,
  });

export const searchUsers = (email: string) =>
  apiCall<User>({
    method: 'get',
    path: '/user/search',
    params: { email },
  });

export const getUserDegrees = (userId: string) =>
  apiCall<DegreeDocumentsResponse>({
    method: 'get',
    path: `/degree/user/${userId}`,
  });

export const getAccessibleDegrees = () =>
  apiCall<AccessibleDegreesResponse>({
    method: 'get',
    path: '/degree/accessible',
  });

export const getRecentIssuedDegrees = () =>
  apiCall<DegreeDocumentsResponse>({
    method: 'get',
    path: '/degree/recent-issued',
  });

export const getRecentVerifications = () =>
  apiCall<any[]>({
    method: 'get',
    path: '/degree/recent-verifications',
  });

export const getAllLedgerRecords = () =>
  apiCall<any[]>({
    method: 'get',
    path: '/degree/all-records',
  });
