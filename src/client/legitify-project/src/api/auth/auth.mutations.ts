import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { login, logout, register } from './auth.api';
import { LoginParams, LoginResponse, RegisterParams } from './auth.models';

export const useLoginMutation = () =>
  useMutation<LoginResponse, AxiosError, LoginParams>({
    mutationFn: params => login(params),
  });

export const useRegisterMutation = () =>
  useMutation<{ uid: string }, AxiosError, RegisterParams>({
    mutationFn: params => register(params),
  });

export const useLogoutMutation = () =>
  useMutation<void, AxiosError, string>({
    mutationFn: token => logout(token),
  });
