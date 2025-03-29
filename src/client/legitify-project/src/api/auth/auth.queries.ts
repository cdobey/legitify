import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { UserProfile } from './auth.models';

// Fetch user profile using the token in sessionStorage
const fetchUserProfile = async (): Promise<UserProfile> => {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('No active session');
  }

  return authApi.getProfile();
};

// Use this hook to get the current user profile
export const useProfile = (enabled = true) => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchUserProfile,
    enabled,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Registration mutation
export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      await authApi.register(data);
      return { success: true };
    },
  });
};

// Login mutation - for backwards compatibility
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return authApi.login(credentials.email, credentials.password);
    },
  });
};
