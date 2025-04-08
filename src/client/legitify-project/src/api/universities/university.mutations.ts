import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  addStudentToUniversity,
  createUniversity,
  registerStudent,
  requestJoinUniversity,
  respondToAffiliation,
} from './university.api';
import {
  AddStudentParams,
  AffiliationResponse,
  AffiliationResponseParams,
  CreateUniversityParams,
  CreateUniversityResponse,
  JoinUniversityParams,
  RegisterStudentParams,
  RegisterStudentResponse,
} from './university.models';
import { universityKeys } from './university.queries';

export const useCreateUniversityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateUniversityResponse, AxiosError, CreateUniversityParams>({
    mutationFn: params => createUniversity(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universityKeys.my() });
    },
  });
};

export const useJoinUniversityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, JoinUniversityParams>({
    mutationFn: params => requestJoinUniversity(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universityKeys.pendingAffiliations() });
    },
  });
};

export const useAddStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError, AddStudentParams>({
    mutationFn: params => addStudentToUniversity(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universityKeys.my() });
    },
  });
};

export const useRegisterStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<RegisterStudentResponse, AxiosError, RegisterStudentParams>({
    mutationFn: params => registerStudent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universityKeys.my() });
    },
  });
};

export const useRespondToAffiliationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<AffiliationResponse, AxiosError, AffiliationResponseParams>({
    mutationFn: params => respondToAffiliation(params),
    onSuccess: (_, variables) => {
      // If accepting the affiliation, also refresh student's affiliations
      if (variables.accept) {
        queryClient.invalidateQueries({ queryKey: universityKeys.studentAffiliations() });
      }
      queryClient.invalidateQueries({ queryKey: universityKeys.pendingAffiliations() });
      queryClient.invalidateQueries({ queryKey: universityKeys.my() });
    },
  });
};
