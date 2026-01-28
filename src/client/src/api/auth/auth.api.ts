import { apiCall } from '../apiCall';
import {
  LoginParams,
  LoginResponse,
  RegisterParams,
  ServiceStatus,
  UserProfile,
} from './auth.models';

export const login = (params: LoginParams): Promise<LoginResponse> => {
  return apiCall<LoginResponse>({
    method: 'post',
    path: '/auth/login',
    params,
  });
};

export const register = (
  params: RegisterParams,
): Promise<{ uid: string; message: string; metadata?: any; issuer?: any }> => {
  return apiCall<{ uid: string; message: string; metadata?: any; issuer?: any }>({
    method: 'post',
    path: '/auth/register',
    params,
  });
};

export const getProfile = (): Promise<UserProfile> => {
  return apiCall<UserProfile>({
    method: 'get',
    path: '/me',
  });
};

export const getBackendStatus = (): Promise<ServiceStatus> => {
  return apiCall<ServiceStatus>({
    method: 'get',
    path: '/status/backend',
    config: {
      timeout: 5000,
    },
  });
};

export const getLedgerStatus = (): Promise<ServiceStatus> => {
  return apiCall<ServiceStatus>({
    method: 'get',
    path: '/status/ledger',
    config: {
      timeout: 5000,
    },
  });
};
