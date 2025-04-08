import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  getAccessibleDegrees,
  getAccessRequests,
  getAllLedgerRecords,
  getMyDegrees,
  getRecentIssuedDegrees,
  getRecentVerifications,
  getUserDegrees,
  viewDegree,
} from './degree.api';
import {
  AccessibleDegreesResponse,
  AccessRequestsResponse,
  DegreeDocument,
  DegreeDocumentsResponse,
} from './degree.models';

export const degreeKeys = {
  all: ['degrees'] as const,
  lists: () => [...degreeKeys.all, 'list'] as const,
  requests: () => [...degreeKeys.all, 'requests'] as const,
  accessible: () => [...degreeKeys.all, 'accessible'] as const,
  user: (userId: string) => [...degreeKeys.all, 'user', userId] as const,
  degree: (docId: string) => [...degreeKeys.all, 'degree', docId] as const,
};

export const useMyDegreesQuery = (
  options?: Partial<UseQueryOptions<DegreeDocumentsResponse, AxiosError>>,
) =>
  useQuery<DegreeDocumentsResponse, AxiosError>({
    queryKey: degreeKeys.lists(),
    queryFn: () => getMyDegrees(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useUserDegreesQuery = (
  userId: string,
  options?: Partial<UseQueryOptions<DegreeDocumentsResponse, AxiosError>>,
) =>
  useQuery<DegreeDocumentsResponse, AxiosError>({
    queryKey: degreeKeys.user(userId),
    queryFn: () => getUserDegrees(userId) as Promise<DegreeDocumentsResponse>,
    ...options,
  });

export const useAccessRequestsQuery = (
  options?: Partial<UseQueryOptions<AccessRequestsResponse, AxiosError>>,
) =>
  useQuery<AccessRequestsResponse, AxiosError>({
    queryKey: degreeKeys.requests(),
    queryFn: () => getAccessRequests(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useAccessibleDegreesQuery = (
  options?: Partial<UseQueryOptions<AccessibleDegreesResponse, AxiosError>>,
) =>
  useQuery<AccessibleDegreesResponse, AxiosError>({
    queryKey: degreeKeys.accessible(),
    queryFn: () => getAccessibleDegrees(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useViewDegreeQuery = (
  docId: string,
  options?: Partial<UseQueryOptions<DegreeDocument, AxiosError>>,
) =>
  useQuery<DegreeDocument, AxiosError>({
    queryKey: degreeKeys.degree(docId),
    queryFn: () => viewDegree(docId),
    ...options,
  });

export const useRecentIssuedDegreesQuery = (
  options?: Partial<UseQueryOptions<DegreeDocumentsResponse, AxiosError>>,
) =>
  useQuery<DegreeDocumentsResponse, AxiosError>({
    queryKey: [...degreeKeys.all, 'recent-issued'],
    queryFn: () => getRecentIssuedDegrees(),
    ...options,
  });

export const useRecentVerificationsQuery = (
  options?: Partial<UseQueryOptions<any[], AxiosError>>,
) =>
  useQuery<any[], AxiosError>({
    queryKey: [...degreeKeys.all, 'recent-verifications'],
    queryFn: () => getRecentVerifications(),
    ...options,
  });

export const useLedgerRecordsQuery = (options?: Partial<UseQueryOptions<any[], AxiosError>>) =>
  useQuery<any[], AxiosError>({
    queryKey: [...degreeKeys.all, 'ledger-records'],
    queryFn: () => getAllLedgerRecords(),
    ...options,
  });
