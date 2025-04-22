import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  addHolderToIssuer,
  createIssuer,
  deleteIssuerLogo,
  registerHolder,
  requestHolderAffiliation,
  requestJoinIssuer,
  respondToAffiliation,
  respondToJoinRequest,
  uploadIssuerLogo,
} from './issuer.api';
import {
  AddHolderParams,
  AffiliationResponse,
  AffiliationResponseParams,
  CreateIssuerParams,
  CreateIssuerResponse,
  Issuer,
  JoinIssuerParams,
  JoinRequestResponse,
  JoinRequestResponseParams,
  RegisterHolderParams,
  RegisterHolderResponse,
} from './issuer.models';
import { issuerKeys } from './issuer.queries';

export const useCreateIssuerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateIssuerResponse, AxiosError, CreateIssuerParams>({
    mutationFn: params => createIssuer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
    },
  });
};

export const useJoinIssuerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, JoinIssuerParams>({
    mutationFn: params => requestJoinIssuer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.pendingAffiliations() });
    },
  });
};

export const useHolderJoinIssuerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, JoinIssuerParams>({
    mutationFn: params => requestHolderAffiliation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.pendingAffiliations() });
    },
  });
};

export const useAddHolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, AddHolderParams>({
    mutationFn: params => addHolderToIssuer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
    },
  });
};

export const useRegisterHolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<RegisterHolderResponse, AxiosError, RegisterHolderParams>({
    mutationFn: params => registerHolder(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
    },
  });
};

export const useRespondToAffiliationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AffiliationResponse, AxiosError, AffiliationResponseParams>({
    mutationFn: params => respondToAffiliation(params),
    onSuccess: (_, variables) => {
      // If accepting the affiliation, also refresh holder's affiliations
      if (variables.accept) {
        queryClient.invalidateQueries({ queryKey: issuerKeys.holderAffiliations() });
      }
      queryClient.invalidateQueries({ queryKey: issuerKeys.pendingAffiliations() });
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
    },
  });
};

export const useUploadIssuerLogoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; issuer: Issuer },
    AxiosError,
    { issuerId: string; logoFile: File }
  >({
    mutationFn: ({ issuerId, logoFile }) => uploadIssuerLogo(issuerId, logoFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
      queryClient.invalidateQueries({ queryKey: issuerKeys.all_issuers() });
    },
  });
};

export const useDeleteIssuerLogoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; issuer: Issuer }, AxiosError, string>({
    mutationFn: issuerId => deleteIssuerLogo(issuerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
      queryClient.invalidateQueries({ queryKey: issuerKeys.all_issuers() });
    },
  });
};

export const useRespondToJoinRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; request: JoinRequestResponse },
    AxiosError,
    JoinRequestResponseParams
  >({
    mutationFn: params => respondToJoinRequest(params),
    onSuccess: () => {
      // Invalidating pending join requests to refresh the list
      queryClient.invalidateQueries({ queryKey: issuerKeys.pendingJoinRequests() });
    },
  });
};
