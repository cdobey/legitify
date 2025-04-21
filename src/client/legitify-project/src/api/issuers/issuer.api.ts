import axios from 'axios';
import { apiCall } from '../apiCall';
import {
  AddHolderParams,
  AffiliationResponse,
  AffiliationResponseParams,
  AffiliationsResponse,
  CreateIssuerParams,
  CreateIssuerResponse,
  Issuer,
  IssuersResponse,
  JoinIssuerParams,
  JoinRequestResponse,
  JoinRequestResponseParams,
  JoinRequestsResponse,
  RegisterHolderParams,
  RegisterHolderResponse,
} from './issuer.models';

export const getMyIssuers = () => apiCall<IssuersResponse>({ method: 'get', path: '/issuer/my' });

export const createIssuer = (params: CreateIssuerParams) =>
  apiCall<CreateIssuerResponse>({
    method: 'post',
    path: '/issuer/create',
    params,
  });

export const requestJoinIssuer = (params: JoinIssuerParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/issuer/request-join',
    params,
  });

export const requestHolderAffiliation = (params: JoinIssuerParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/issuer/request-holder-affiliation',
    params,
  });

export const getAllIssuers = () =>
  apiCall<IssuersResponse>({
    method: 'get',
    path: '/issuer/all',
  });

export const addHolderToIssuer = (params: AddHolderParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/issuer/add-holder',
    params,
  });

export const registerHolder = (params: RegisterHolderParams) =>
  apiCall<RegisterHolderResponse>({
    method: 'post',
    path: '/issuer/register-holder',
    params,
  });

export const respondToAffiliation = (params: AffiliationResponseParams) =>
  apiCall<AffiliationResponse>({
    method: 'post',
    path: '/issuer/respond-affiliation',
    params,
  });

export const getHolderIssuers = () =>
  apiCall<IssuersResponse>({
    method: 'get',
    path: '/issuer/my-affiliations',
  });

export const getPendingAffiliations = () =>
  apiCall<AffiliationsResponse>({
    method: 'get',
    path: '/issuer/pending-affiliations',
  });

export const getIssuerHolders = (issuerId: string) =>
  apiCall<{ holders: AffiliationsResponse }>({
    method: 'get',
    path: `/issuer/${issuerId}/holders`,
  });

export const uploadIssuerLogo = async (issuerId: string, logoFile: File) => {
  // Simple direct implementation for file uploads
  const formData = new FormData();
  formData.append('file', logoFile);

  const token = sessionStorage.getItem('token');
  const baseURL = import.meta.env.VITE_API_URL || '/api';

  try {
    const response = await axios.post(`${baseURL}/issuer/${issuerId}/logo`, formData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Logo upload failed:', error);
    throw error;
  }
};

export const deleteIssuerLogo = (issuerId: string) =>
  apiCall<{ message: string; issuer: Issuer }>({
    method: 'delete',
    path: `/issuer/${issuerId}/logo`,
  });

export const getPendingJoinRequests = () =>
  apiCall<JoinRequestsResponse>({
    method: 'get',
    path: '/issuer/pending-join-requests',
  });

export const respondToJoinRequest = (params: JoinRequestResponseParams) =>
  apiCall<{ message: string; request: JoinRequestResponse }>({
    method: 'post',
    path: '/issuer/respond-join-request',
    params,
  });

export const getMyPendingJoinRequests = () =>
  apiCall<JoinRequestsResponse>({
    method: 'get',
    path: '/issuer/my-pending-join-requests',
  });
