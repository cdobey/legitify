import api from "../utils/api";

export const issueDegree = async (individualId: string, base64File: string) => {
  const response = await api.post("/degree/issue", {
    individualId,
    base64File,
  });
  return response.data;
};

export const acceptDegree = async (docId: string) => {
  const response = await api.post("/degree/accept", { docId });
  return response.data;
};

export const denyDegree = async (docId: string) => {
  const response = await api.post("/degree/deny", { docId });
  return response.data;
};

export const requestAccess = async (docId: string) => {
  const response = await api.post("/degree/requestAccess", { docId });
  return response.data;
};

export const grantAccess = async (requestId: string, granted: boolean) => {
  const response = await api.post("/degree/grantAccess", {
    requestId,
    granted,
  });
  return response.data;
};

export const viewDegree = async (docId: string) => {
  const response = await api.get(`/degree/view/${docId}`);
  return response.data;
};

export const getAccessRequests = async () => {
  const response = await api.get("/degree/requests");
  return response.data;
};

export const getMyDegrees = async () => {
  const response = await api.get("/degree/list");
  return response.data;
};

export const searchUsers = async (email: string) => {
  const response = await api.get(
    `/user/search?email=${encodeURIComponent(email)}`
  );
  return response.data;
};

export const verifyDocument = async (
  individualId: string,
  base64File: string
) => {
  const response = await api.post("/degree/verify", {
    individualId,
    base64File,
  });
  return response.data;
};

export const getUserDegrees = async (userId: string) => {
  const response = await api.get(`/degree/user/${userId}`);
  return response.data;
};
