import apiCall from "../apiCall";
import {
  AccessRequest,
  DegreeDocument,
  IssueResponse,
  VerificationResult,
} from "./degree.models";

export const degreeApi = {
  getMyDegrees: () =>
    apiCall<DegreeDocument[]>({ method: "get", path: "/degree/list" }),

  issueDegree: (individualId: string, base64File: string) =>
    apiCall<IssueResponse>({
      method: "post",
      path: "/degree/issue",
      params: { individualId, base64File },
    }),

  verifyDegree: (individualId: string, base64File: string) =>
    apiCall<VerificationResult>({
      method: "post",
      path: "/degree/verify",
      params: { individualId, base64File },
    }),

  acceptDegree: (docId: string) =>
    apiCall<{ message: string }>({
      method: "post",
      path: "/degree/accept",
      params: { docId },
    }),

  denyDegree: (docId: string) =>
    apiCall<{ message: string }>({
      method: "post",
      path: "/degree/deny",
      params: { docId },
    }),

  getAccessRequests: () =>
    apiCall<AccessRequest[]>({
      method: "get",
      path: "/degree/requests",
    }),

  requestAccess: (docId: string) =>
    apiCall<{ message: string; requestId: string }>({
      method: "post",
      path: "/degree/requestAccess",
      params: { docId },
    }),

  grantAccess: (requestId: string, granted: boolean) =>
    apiCall<{ message: string }>({
      method: "post",
      path: "/degree/grantAccess",
      params: { requestId, granted },
    }),

  viewDegree: (docId: string) =>
    apiCall({
      method: "get",
      path: `/degree/view/${docId}`,
    }),

  searchUsers: (email: string) =>
    apiCall({
      method: "get",
      path: "/users/search",
      params: { email },
    }),

  getUserDegrees: (userId: string) =>
    apiCall({
      method: "get",
      path: `/degree/user/${userId}`,
    }),
};
