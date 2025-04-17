import axios from 'axios';
import { apiCall } from '../apiCall';
import {
  AddStudentParams,
  AffiliationResponse,
  AffiliationResponseParams,
  AffiliationsResponse,
  CreateUniversityParams,
  CreateUniversityResponse,
  JoinRequestResponse,
  JoinRequestResponseParams,
  JoinRequestsResponse,
  JoinUniversityParams,
  RegisterStudentParams,
  RegisterStudentResponse,
  UniversitiesResponse,
  University,
} from './university.models';

export const getMyUniversities = () =>
  apiCall<UniversitiesResponse>({ method: 'get', path: '/university/my' });

export const createUniversity = (params: CreateUniversityParams) =>
  apiCall<CreateUniversityResponse>({
    method: 'post',
    path: '/university/create',
    params,
  });

export const requestJoinUniversity = (params: JoinUniversityParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/university/request-join',
    params,
  });

export const requestStudentAffiliation = (params: JoinUniversityParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/university/request-student-affiliation',
    params,
  });

export const getAllUniversities = () =>
  apiCall<UniversitiesResponse>({
    method: 'get',
    path: '/university/all',
  });

export const addStudentToUniversity = (params: AddStudentParams) =>
  apiCall<{ message: string }>({
    method: 'post',
    path: '/university/add-student',
    params,
  });

export const registerStudent = (params: RegisterStudentParams) =>
  apiCall<RegisterStudentResponse>({
    method: 'post',
    path: '/university/register-student',
    params,
  });

export const respondToAffiliation = (params: AffiliationResponseParams) =>
  apiCall<AffiliationResponse>({
    method: 'post',
    path: '/university/respond-affiliation',
    params,
  });

export const getStudentUniversities = () =>
  apiCall<UniversitiesResponse>({
    method: 'get',
    path: '/university/my-affiliations',
  });

export const getPendingAffiliations = () =>
  apiCall<AffiliationsResponse>({
    method: 'get',
    path: '/university/pending-affiliations',
  });

export const getUniversityStudents = (universityId: string) =>
  apiCall<{ affiliations: AffiliationsResponse }>({
    method: 'get',
    path: `/university/${universityId}/students`,
  });

export const uploadUniversityLogo = async (universityId: string, logoFile: File) => {
  // Simple direct implementation for file uploads
  const formData = new FormData();
  formData.append('file', logoFile);

  const token = sessionStorage.getItem('token');
  const baseURL = import.meta.env.VITE_API_URL || '/api';

  try {
    const response = await axios.post(`${baseURL}/university/${universityId}/logo`, formData, {
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

export const deleteUniversityLogo = (universityId: string) =>
  apiCall<{ message: string; university: University }>({
    method: 'delete',
    path: `/university/${universityId}/logo`,
  });

export const getPendingJoinRequests = () =>
  apiCall<JoinRequestsResponse>({
    method: 'get',
    path: '/university/pending-join-requests',
  });

export const respondToJoinRequest = (params: JoinRequestResponseParams) =>
  apiCall<{ message: string; request: JoinRequestResponse }>({
    method: 'post',
    path: '/university/respond-join-request',
    params,
  });
