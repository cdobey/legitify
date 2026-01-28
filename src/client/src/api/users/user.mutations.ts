import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  changePassword,
  deleteProfilePicture,
  disableTwoFactor,
  enableTwoFactor,
  getUserCredentials,
  searchUsers,
  updateProfile,
  uploadProfilePicture,
  verifyTwoFactor,
} from './user.api';
import {
  Credential,
  TwoFactorDisableRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  User,
} from './user.models';

export const useSearchUserMutation = () =>
  useMutation<User, AxiosError, string>({
    mutationFn: email => searchUsers(email),
  });

// Added query hook for user credentials
export const useUserCredentialsQuery = (userId: string) =>
  useQuery<{ credentials: Credential[] }, AxiosError>({
    queryKey: ['userCredentials', userId],
    queryFn: () => getUserCredentials(userId),
    enabled: !!userId,
  });

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    User,
    AxiosError,
    {
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      country?: string;
    }
  >({
    mutationFn: data => updateProfile(data),
    onSuccess: updatedUser => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.setQueryData(['userProfile'], updatedUser);
    },
  });
};

export const useUploadProfilePictureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<User, AxiosError, File>({
    mutationFn: file => uploadProfilePicture(file),
    onSuccess: updatedUser => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.setQueryData(['userProfile'], updatedUser);
    },
  });
};

export const useDeleteProfilePictureMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<User, AxiosError>({
    mutationFn: () => deleteProfilePicture(),
    onSuccess: updatedUser => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.setQueryData(['userProfile'], updatedUser);
    },
  });
};

export const useChangePasswordMutation = () => {
  return useMutation<
    { message: string },
    AxiosError,
    { currentPassword: string; newPassword: string }
  >({
    mutationFn: data => changePassword(data),
  });
};

export const useEnableTwoFactorMutation = () => {
  return useMutation<TwoFactorSetupResponse, AxiosError>({
    mutationFn: () => enableTwoFactor(),
  });
};

export const useVerifyTwoFactorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, AxiosError, TwoFactorVerifyRequest>({
    mutationFn: data => verifyTwoFactor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
};

export const useDisableTwoFactorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, AxiosError, TwoFactorDisableRequest>({
    mutationFn: data => disableTwoFactor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
};
