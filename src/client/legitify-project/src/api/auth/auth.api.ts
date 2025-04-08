import apiCall from '../apiCall';
import { LoginParams, LoginResponse, RegisterParams, UserProfile } from './auth.models';

export const login = (params: LoginParams): Promise<LoginResponse> => {
  return apiCall<LoginResponse>({
    method: 'post',
    path: '/auth/login',
    params,
  });
};

export const register = (params: RegisterParams): Promise<{ uid: string }> => {
  return apiCall<{ uid: string }>({
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
