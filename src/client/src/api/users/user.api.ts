import { apiCall } from '../apiCall';
import {
  Credential,
  OrgName,
  ServerUserResponse,
  TwoFactorDisableRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  User,
} from './user.models';

export const searchUsers = async (email: string): Promise<User> => {
  const response = await apiCall<ServerUserResponse>({
    method: 'get',
    path: '/user/search',
    params: { email },
  });

  return {
    id: response.uid,
    email: response.email,
    username: response.username,
    firstName: response.firstName,
    lastName: response.lastName,
    country: response.country,
    orgName: response.orgName || OrgName.orgholder,
    profilePictureUrl: response.profilePictureUrl,
    role: response.role || 'holder',
    twoFactorEnabled: false,
    createdAt: '',
    updatedAt: '',
  };
};

export const getUserCredentials = (userId: string) =>
  apiCall<{ credentials: Credential[] }>({
    method: 'get',
    path: `/credentials/user/${userId}`,
  });

export const updateProfile = async (data: {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
}): Promise<User> => {
  const response = await apiCall<User>({
    method: 'put',
    path: '/user/profile',
    params: data,
  });

  return response;
};

export const uploadProfilePicture = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiCall<{ message: string; user: User }>({
    method: 'post',
    path: '/user/profile-picture',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.user;
};

export const deleteProfilePicture = async (): Promise<User> => {
  const response = await apiCall<{ message: string; user: User }>({
    method: 'delete',
    path: '/user/profile-picture',
  });

  return response.user;
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const response = await apiCall<{ message: string }>({
    method: 'put',
    path: '/user/password',
    params: data,
  });

  return response;
};

export const enableTwoFactor = async (): Promise<TwoFactorSetupResponse> => {
  const response = await apiCall<TwoFactorSetupResponse>({
    method: 'post',
    path: '/user/2fa/enable',
  });

  return response;
};

export const verifyTwoFactor = async (
  data: TwoFactorVerifyRequest,
): Promise<{ message: string }> => {
  const response = await apiCall<{ message: string }>({
    method: 'post',
    path: '/user/2fa/verify',
    params: data,
  });

  return response;
};

export const disableTwoFactor = async (
  data: TwoFactorDisableRequest,
): Promise<{ message: string }> => {
  const response = await apiCall<{ message: string }>({
    method: 'post',
    path: '/user/2fa/disable',
    params: data,
  });

  return response;
};
