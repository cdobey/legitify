import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { getBackendStatus, getLedgerStatus, getProfile } from './auth.api';
import { ServiceStatus, UserProfile } from './auth.models';

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

export const useBackendStatusQuery = (
  options?: Partial<UseQueryOptions<ServiceStatus, AxiosError>>,
) =>
  useQuery<ServiceStatus, AxiosError>({
    queryKey: ['backendStatus'],
    queryFn: getBackendStatus,
    refetchInterval: 30000,
    retry: 1,
    ...options,
  });

export const useLedgerStatusQuery = (
  options?: Partial<UseQueryOptions<ServiceStatus, AxiosError>>,
) =>
  useQuery<ServiceStatus, AxiosError>({
    queryKey: ['ledgerStatus'],
    queryFn: getLedgerStatus,
    refetchInterval: 30000,
    retry: 1,
    ...options,
  });
