import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { login, register } from './auth.api';
import { LoginParams, LoginResponse, RegisterParams } from './auth.models';

export const useLoginMutation = () =>
  useMutation<LoginResponse, AxiosError, LoginParams>({
    mutationFn: params => login(params),
  });

export const useRegisterMutation = () =>
  useMutation<
    { uid: string; message: string; metadata?: any; issuer?: any },
    AxiosError,
    RegisterParams
  >({
    mutationFn: params => register(params),
  });
