import apiCall from '../apiCall';
import {
  AddStudentParams,
  AffiliationResponse,
  AffiliationResponseParams,
  AffiliationsResponse,
  CreateUniversityParams,
  CreateUniversityResponse,
  JoinUniversityParams,
  RegisterStudentParams,
  RegisterStudentResponse,
  UniversitiesResponse,
} from './university.models';

export const getMyUniversities = () =>
  apiCall<UniversitiesResponse>({ method: 'get', path: '/university/my' });

export const getUniversityPendingAffiliations = (universityId: string) =>
  apiCall<AffiliationsResponse>({
    method: 'get',
    path: `/university/${universityId}/pending-affiliations`,
  });

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
