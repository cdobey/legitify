import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  getAllIssuers,
  getHolderIssuers,
  getMyIssuers,
  getMyPendingJoinRequests,
  getPendingAffiliations,
  getPendingJoinRequests,
} from './issuer.api';
import {
  AffiliationsResponse,
  Issuer,
  IssuersResponse,
  JoinRequestsResponse,
} from './issuer.models';

export const issuerKeys = {
  all: ['issuers'] as const,
  lists: () => [...issuerKeys.all, 'list'] as const,
  my: () => [...issuerKeys.all, 'my'] as const,
  all_issuers: () => [...issuerKeys.all, 'all'] as const,
  pending: (issuerId: string) => [...issuerKeys.all, 'pending', issuerId] as const,
  holderAffiliations: () => [...issuerKeys.all, 'holder-affiliations'] as const,
  pendingAffiliations: () => [...issuerKeys.all, 'pending-affiliations'] as const,
  pendingJoinRequests: () => [...issuerKeys.all, 'pending-join-requests'] as const,
  myPendingJoinRequests: () => [...issuerKeys.all, 'my-pending-join-requests'] as const,
};

export const useMyIssuersQuery = (
  options?: Partial<UseQueryOptions<IssuersResponse, AxiosError>>,
) =>
  useQuery<IssuersResponse, AxiosError>({
    queryKey: issuerKeys.my(),
    queryFn: () => getMyIssuers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    ...options,
  });

export const useAllIssuersQuery = (
  options?: Partial<UseQueryOptions<IssuersResponse, AxiosError>>,
) =>
  useQuery<IssuersResponse, AxiosError>({
    queryKey: issuerKeys.all_issuers(),
    queryFn: () => getAllIssuers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

export const useHolderIssuersQuery = (
  options?: Partial<UseQueryOptions<IssuersResponse, AxiosError>>,
) =>
  useQuery<IssuersResponse, AxiosError>({
    queryKey: issuerKeys.holderAffiliations(),
    queryFn: () => getHolderIssuers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

export const usePendingAffiliationsQuery = (
  options?: Partial<UseQueryOptions<AffiliationsResponse, AxiosError>>,
) =>
  useQuery<AffiliationsResponse, AxiosError>({
    queryKey: issuerKeys.pendingAffiliations(),
    queryFn: () => getPendingAffiliations(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const usePendingJoinRequestsQuery = (
  options?: Partial<UseQueryOptions<JoinRequestsResponse, AxiosError>>,
) =>
  useQuery<JoinRequestsResponse, AxiosError>({
    queryKey: issuerKeys.pendingJoinRequests(),
    queryFn: () => getPendingJoinRequests(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const useMyPendingJoinRequestsQuery = (
  options?: Partial<UseQueryOptions<JoinRequestsResponse, AxiosError>>,
) =>
  useQuery<JoinRequestsResponse, AxiosError>({
    queryKey: issuerKeys.myPendingJoinRequests(),
    queryFn: () => getMyPendingJoinRequests(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const usePrimaryIssuerQuery = (
  userId?: string,
  role?: 'issuer' | 'holder',
  options?: Partial<UseQueryOptions<IssuersResponse, AxiosError, Issuer | null>>,
) =>
  useQuery<IssuersResponse, AxiosError, Issuer | null>({
    queryKey: issuerKeys.my(),
    queryFn: getMyIssuers,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: Boolean(userId),
    select: (issuers): Issuer | null => {
      if (!issuers || issuers.length === 0) return null;

      if (role === 'issuer') {
        const owned = issuers.find(u => u.ownerId === userId);
        return owned ?? issuers[0];
      }

      return issuers[0];
    },
    ...options,
  });
