import { Degree, VerificationResponse } from "../types/degree";
import { User } from "../types/user";
import api from "../utils/api";

// Now each API call marks its response type

export const issueDegree = async (
  individualId: string,
  base64File: string
): Promise<{ docId: string; docHash: string; message: string }> => {
  const response = await api.post<{
    docId: string;
    docHash: string;
    message: string;
  }>("/degree/issue", {
    individualId,
    base64File,
  });
  return response.data;
};

export const acceptDegree = async (
  docId: string
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/degree/accept", {
    docId,
  });
  return response.data;
};

export const denyDegree = async (
  docId: string
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/degree/deny", {
    docId,
  });
  return response.data;
};

export const requestAccess = async (
  docId: string
): Promise<{ message: string; requestId: string }> => {
  const response = await api.post<{ message: string; requestId: string }>(
    "/degree/requestAccess",
    { docId }
  );
  return response.data;
};

export const grantAccess = async (
  requestId: string,
  granted: boolean
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/degree/grantAccess", {
    requestId,
    granted,
  });
  return response.data;
};

export const viewDegree = async (
  docId: string
): Promise<{
  fileData: string | null;
  status: string;
  issuer: string;
  issuedAt: string;
  docId: string;
  verified?: boolean;
}> => {
  const response = await api.get<{
    fileData: string | null;
    status: string;
    issuer: string;
    issuedAt: string;
    docId: string;
  }>(`/degree/view/${docId}`);
  return response.data;
};

export const getAccessRequests = async (): Promise<any[]> => {
  const response = await api.get<any[]>("/degree/requests");
  return response.data;
};

export const getMyDegrees = async (): Promise<Degree[]> => {
  const response = await api.get<Degree[]>("/degree/list");
  return response.data;
};

export const searchUsers = async (email: string): Promise<User> => {
  const response = await api.get<User>(
    `/user/search?email=${encodeURIComponent(email)}`
  );
  return response.data;
};

export const verifyDocument = async (
  individualId: string,
  base64File: string
): Promise<VerificationResponse> => {
  const response = await api.post<VerificationResponse>("/degree/verify", {
    individualId,
    base64File,
  });
  return response.data;
};

export const getUserDegrees = async (userId: string): Promise<Degree[]> => {
  const response = await api.get<Degree[]>(`/degree/user/${userId}`);
  return response.data;
};
