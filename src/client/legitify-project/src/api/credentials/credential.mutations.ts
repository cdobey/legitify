import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  acceptCredential,
  denyCredential,
  grantAccess,
  issueCredential,
  requestAccess,
  verifyCredential,
} from './credential.api';
import { CredentialDetails, CredentialResponse, VerificationResult } from './credential.models';
import { credentialKeys } from './credential.queries';

export const useIssueCredentialMutation = () =>
  useMutation<CredentialResponse, AxiosError, CredentialDetails>({
    mutationFn: details => issueCredential(details),
  });

export const useVerifyCredentialMutation = () =>
  useMutation<VerificationResult, AxiosError, { email: string; base64File: string }>({
    mutationFn: ({ email, base64File }) => verifyCredential(email, base64File),
  });

export const useAcceptCredentialMutation = () =>
  useMutation<{ message: string }, AxiosError, string>({
    mutationFn: docId => acceptCredential(docId),
  });

export const useDenyCredentialMutation = () =>
  useMutation<{ message: string }, AxiosError, string>({
    mutationFn: docId => denyCredential(docId),
  });

export const useRequestAccessMutation = () =>
  useMutation<{ message: string; requestId: string }, AxiosError, string>({
    mutationFn: docId => requestAccess(docId),
  });

export const useGrantAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, { requestId: string; granted: boolean }>({
    mutationFn: params => {
      return grantAccess(params);
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger refetches
      queryClient.invalidateQueries({ queryKey: credentialKeys.requests() });
      queryClient.invalidateQueries({ queryKey: credentialKeys.accessible() });
    },
    onError: error => {
      console.error('Grant access mutation failed:', error);
    },
  });
};

// Legacy aliases for backward compatibility
export const useIssueDegreeeMutation = useIssueCredentialMutation;
export const useVerifyDegreeMutation = useVerifyCredentialMutation;
export const useAcceptDegreeMutation = useAcceptCredentialMutation;
export const useDenyDegreeMutation = useDenyCredentialMutation;
