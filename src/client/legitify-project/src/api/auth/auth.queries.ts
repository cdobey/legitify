import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { getProfile } from './auth.api';
import { UserProfile } from './auth.models';

// Fetch user profile using the token in sessionStorage
export const fetchUserProfile = async (): Promise<UserProfile> => {
  const token = sessionStorage.getItem('token');

  if (!token) {
    throw new Error('No active session');
  }

  return getProfile();
};

export const useUserProfileQuery = (options?: Partial<UseQueryOptions<UserProfile, AxiosError>>) =>
  useQuery<UserProfile, AxiosError>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    ...options,
  });
