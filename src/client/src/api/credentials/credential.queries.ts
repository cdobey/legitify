import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  getAccessibleCredentials,
  getAccessRequests,
  getAllLedgerRecords,
  getMyCredentials,
  getRecentIssuedCredentials,
  getUserCredentials,
  viewCredential,
} from './credential.api';
import {
  AccessibleCredentialsResponse,
  AccessRequestsResponse,
  CredentialDocument,
  CredentialDocumentsResponse,
  LedgerRecord,
} from './credential.models';

export const credentialKeys = {
  all: ['credentials'] as const,
  lists: () => [...credentialKeys.all, 'list'] as const,
  requests: () => [...credentialKeys.all, 'requests'] as const,
  accessible: () => [...credentialKeys.all, 'accessible'] as const,
  user: (userId: string) => [...credentialKeys.all, 'user', userId] as const,
  credential: (docId: string) => [...credentialKeys.all, 'credential', docId] as const,
};

export const useMyCredentialsQuery = (
  options?: Partial<UseQueryOptions<CredentialDocumentsResponse, AxiosError>>,
) =>
  useQuery<CredentialDocumentsResponse, AxiosError>({
    queryKey: credentialKeys.lists(),
    queryFn: () => getMyCredentials(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useUserCredentialsQuery = (
  userId: string,
  options?: Partial<UseQueryOptions<CredentialDocumentsResponse, AxiosError>>,
) =>
  useQuery<CredentialDocumentsResponse, AxiosError>({
    queryKey: credentialKeys.user(userId),
    queryFn: () => getUserCredentials(userId),
    ...options,
  });

export const useAccessRequestsQuery = (
  options?: Partial<UseQueryOptions<AccessRequestsResponse, AxiosError>>,
) =>
  useQuery<AccessRequestsResponse, AxiosError>({
    queryKey: credentialKeys.requests(),
    queryFn: () => getAccessRequests(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useAccessibleCredentialsQuery = (
  options?: Partial<UseQueryOptions<AccessibleCredentialsResponse, AxiosError>>,
) =>
  useQuery<AccessibleCredentialsResponse, AxiosError>({
    queryKey: credentialKeys.accessible(),
    queryFn: () => getAccessibleCredentials(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useViewCredentialQuery = (
  docId: string,
  options?: Partial<UseQueryOptions<CredentialDocument, AxiosError>>,
) =>
  useQuery<CredentialDocument, AxiosError>({
    queryKey: credentialKeys.credential(docId),
    queryFn: () => viewCredential(docId),
    ...options,
  });

export const useRecentIssuedCredentialsQuery = (
  options?: Partial<UseQueryOptions<CredentialDocumentsResponse, AxiosError>>,
) =>
  useQuery<CredentialDocumentsResponse, AxiosError>({
    queryKey: [...credentialKeys.all, 'recent-issued'],
    queryFn: () => getRecentIssuedCredentials(),
    ...options,
  });

export const useLedgerRecordsQuery = (
  options?: Partial<UseQueryOptions<LedgerRecord[], AxiosError>>,
) =>
  useQuery<LedgerRecord[], AxiosError>({
    queryKey: [...credentialKeys.all, 'ledger-records'],
    queryFn: () => getAllLedgerRecords(),
    ...options,
  });

// Legacy aliases for backward compatibility
export const degreeKeys = credentialKeys;
export const useMyDegreesQuery = useMyCredentialsQuery;
export const useUserDegreesQuery = useUserCredentialsQuery;
export const useAccessibleDegreesQuery = useAccessibleCredentialsQuery;
export const useViewDegreeQuery = useViewCredentialQuery;
export const useRecentIssuedDegreesQuery = useRecentIssuedCredentialsQuery;
