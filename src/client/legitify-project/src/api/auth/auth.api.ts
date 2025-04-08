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
  console.log('Registration payload to API:', params); // Debug logging
  return apiCall<{ uid: string }>({
    method: 'post',
    path: '/auth/register',
    params,
  });
};

export const logout = (token: string): Promise<void> => {
  return apiCall<void>({
    method: 'post',
    path: '/auth/logout',
    config: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

export const getProfile = (): Promise<UserProfile> => {
  return apiCall<UserProfile>({
    method: 'get',
    path: '/me',
  });
};
