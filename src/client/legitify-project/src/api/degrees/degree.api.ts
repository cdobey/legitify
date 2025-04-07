import apiCall from '../apiCall';
import { AccessRequest, DegreeDocument, VerificationResult } from './degree.models';

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
  universityId: string; // Added universityId as required parameter
}

export const degreeApi = {
  getMyDegrees: () => apiCall<DegreeDocument[]>({ method: 'get', path: '/degree/list' }),

  issueDegree: (details: DegreeDetails) =>
    apiCall<{ docId: string; docHash: string }>({
      method: 'post',
      path: '/degree/issue',
      params: details,
    }),

  verifyDegree: (email: string, base64File: string) =>
    apiCall<VerificationResult>({
      method: 'post',
      path: '/degree/verify',
      params: { email, base64File },
    }),

  acceptDegree: (docId: string) =>
    apiCall<{ message: string }>({
      method: 'post',
      path: '/degree/accept',
      params: { docId },
    }),

  denyDegree: (docId: string) =>
    apiCall<{ message: string }>({
      method: 'post',
      path: '/degree/deny',
      params: { docId },
    }),

  getAccessRequests: () =>
    apiCall<AccessRequest[]>({
      method: 'get',
      path: '/degree/requests',
    }),

  requestAccess: (docId: string) =>
    apiCall<{ message: string; requestId: string }>({
      method: 'post',
      path: '/degree/requestAccess',
      params: { docId },
    }),

  grantAccess: ({ requestId, granted }: { requestId: string; granted: boolean }) =>
    apiCall<{ message: string }>({
      method: 'post',
      path: '/degree/grantAccess',
      params: { requestId, granted },
    }),

  viewDegree: (docId: string) =>
    apiCall({
      method: 'get',
      path: `/degree/view/${docId}`,
    }),

  searchUsers: (email: string) =>
    apiCall({
      method: 'get',
      path: '/user/search',
      params: { email },
    }),

  getUserDegrees: (userId: string) =>
    apiCall({
      method: 'get',
      path: `/degree/user/${userId}`,
    }),

  getAccessibleDegrees: () =>
    apiCall<any[]>({
      method: 'get',
      path: '/degree/accessible',
    }),

  getRecentIssuedDegrees: () =>
    apiCall<any[]>({
      method: 'get',
      path: '/degree/recent-issued',
    }),

  getRecentVerifications: () =>
    apiCall<any[]>({
      method: 'get',
      path: '/degree/recent-verifications',
    }),

  getAllLedgerRecords: () =>
    apiCall<any[]>({
      method: 'get',
      path: '/degree/all-records',
    }),
};
