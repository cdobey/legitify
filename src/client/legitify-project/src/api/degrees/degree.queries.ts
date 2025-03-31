import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { degreeApi } from './degree.api';
import {
  AccessibleDegree,
  AccessRequest,
  DegreeDocument,
  IssueResponse,
  VerificationResult,
} from './degree.models';

export const degreeKeys = {
  all: ['degrees'] as const,
  lists: () => [...degreeKeys.all, 'list'] as const,
  requests: () => [...degreeKeys.all, 'requests'] as const,
  accessible: () => [...degreeKeys.all, 'accessible'] as const,
};

export const useMyDegrees = (options?: UseQueryOptions<DegreeDocument[]>) =>
  useQuery({
    queryKey: degreeKeys.lists(),
    queryFn: () => degreeApi.getMyDegrees(),
    ...options,
  });

export const useIssueDegree = () =>
  useMutation<IssueResponse, Error, { individualId: string; base64File: string }>({
    mutationFn: ({ individualId, base64File }) => degreeApi.issueDegree(individualId, base64File),
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

export const useAccessRequests = (options?: UseQueryOptions<AccessRequest[]>) =>
  useQuery({
    queryKey: degreeKeys.requests(),
    queryFn: () => degreeApi.getAccessRequests(),
    ...options,
  });

export const useRequestAccess = () =>
  useMutation<{ message: string; requestId: string }, Error, string>({
    mutationFn: docId => degreeApi.requestAccess(docId),
  });

export const useGrantAccess = () =>
  useMutation<{ message: string }, Error, { requestId: string; granted: boolean }>({
    mutationFn: ({ requestId, granted }) => degreeApi.grantAccess(requestId, granted),
  });

export const useAccessibleDegrees = (options?: UseQueryOptions<AccessibleDegree[]>) =>
  useQuery({
    queryKey: degreeKeys.accessible(),
    queryFn: () => degreeApi.getAccessibleDegrees(),
    ...options,
  });
