import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { searchUsers } from './user.api';
import { User } from './user.models';

export const useSearchUserMutation = () =>
  useMutation<User, AxiosError, string>({
    mutationFn: email => searchUsers(email),
  });
