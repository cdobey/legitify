import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  acceptDegree,
  denyDegree,
  grantAccess,
  issueDegree,
  requestAccess,
  verifyDegree,
} from './degree.api';
import { DegreeDetails, DegreeResponse, VerificationResult } from './degree.models';
import { degreeKeys } from './degree.queries';

export const useIssueDegreeeMutation = () =>
  useMutation<DegreeResponse, AxiosError, DegreeDetails>({
    mutationFn: details => issueDegree(details),
  });

export const useVerifyDegreeMutation = () =>
  useMutation<VerificationResult, AxiosError, { email: string; base64File: string }>({
    mutationFn: ({ email, base64File }) => verifyDegree(email, base64File),
  });

export const useAcceptDegreeMutation = () =>
  useMutation<{ message: string }, AxiosError, string>({
    mutationFn: docId => acceptDegree(docId),
  });

export const useDenyDegreeMutation = () =>
  useMutation<{ message: string }, AxiosError, string>({
    mutationFn: docId => denyDegree(docId),
  });

export const useRequestAccessMutation = () =>
  useMutation<{ message: string; requestId: string }, AxiosError, string>({
    mutationFn: docId => requestAccess(docId),
  });

export const useGrantAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, { requestId: string; granted: boolean }>({
    mutationFn: params => {
      console.log('useGrantAccess mutation called with params:', params);
      return grantAccess(params);
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
