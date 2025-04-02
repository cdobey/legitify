import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { degreeApi } from './degree.api';
import {
  AccessibleDegree,
  AccessRequest,
  DegreeDocument,
  IssueResponse,
  User,
  VerificationResult,
} from './degree.models';

export const degreeKeys = {
  all: ['degrees'] as const,
  lists: () => [...degreeKeys.all, 'list'] as const,
  requests: () => [...degreeKeys.all, 'requests'] as const,
  accessible: () => [...degreeKeys.all, 'accessible'] as const,
};

// Fix the type definitions to accept partial options and prioritize fetching
export const useMyDegrees = (options?: Partial<UseQueryOptions<DegreeDocument[]>>) =>
  useQuery<DegreeDocument[]>({
    queryKey: degreeKeys.lists(),
    queryFn: () => degreeApi.getMyDegrees(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useSearchUser = () =>
  useMutation<User, Error, string>({
    mutationFn: async email => degreeApi.searchUsers(email) as Promise<User>,
  });

export const useUserDegrees = (userId: string, options?: any) =>
  useQuery<DegreeDocument[]>({
    queryKey: ['userDegrees', userId],
    queryFn: () => degreeApi.getUserDegrees(userId),
    ...options,
  });

export const useIssueDegree = () =>
  useMutation<
    IssueResponse,
    Error,
    {
      email: string;
      base64File: string;
      degreeTitle: string;
      fieldOfStudy: string;
      graduationDate: string;
      honors: string;
      studentId: string;
      programDuration: string;
      gpa: number;
      additionalNotes?: string;
    }
  >({
    mutationFn: params => degreeApi.issueDegree(params),
  });

export const useVerifyDegree = () =>
  useMutation<VerificationResult, Error, { email: string; base64File: string }>({
    mutationFn: ({ email, base64File }) => degreeApi.verifyDegree(email, base64File),
  });

export const useAcceptDegree = () =>
  useMutation<{ message: string }, Error, string>({
    mutationFn: docId => degreeApi.acceptDegree(docId),
  });

export const useDenyDegree = () =>
  useMutation<{ message: string }, Error, string>({
    mutationFn: docId => degreeApi.denyDegree(docId),
  });

export const useAccessRequests = (options?: Partial<UseQueryOptions<AccessRequest[]>>) =>
  useQuery<AccessRequest[]>({
    queryKey: degreeKeys.requests(),
    queryFn: () => degreeApi.getAccessRequests(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });

export const useRequestAccess = () =>
  useMutation<{ message: string; requestId: string }, Error, string>({
    mutationFn: docId => degreeApi.requestAccess(docId),
  });

export const useGrantAccess = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, { requestId: string; granted: boolean }>({
    mutationFn: params => {
      console.log('useGrantAccess mutation called with params:', params);
      return degreeApi.grantAccess(params);
    },
    onSuccess: () => {
      console.log('Grant access mutation successful, invalidating queries...');
      // Invalidate relevant queries to trigger refetches
      queryClient.invalidateQueries({ queryKey: degreeKeys.requests() });
      queryClient.invalidateQueries({ queryKey: degreeKeys.accessible() });
    },
    onError: error => {
      console.error('Grant access mutation failed:', error);
    },
  });
};

export const useAccessibleDegrees = (options?: Partial<UseQueryOptions<AccessibleDegree[]>>) =>
  useQuery<AccessibleDegree[]>({
    queryKey: degreeKeys.accessible(),
    queryFn: () => degreeApi.getAccessibleDegrees(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
    ...options,
  });
