import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DegreeDocumentsResponse } from '../degrees/degree.models';
import { getUserDegrees } from './user.api';

export const useUserDegreesQuery = (
  userId: string,
  options?: Partial<UseQueryOptions<DegreeDocumentsResponse, AxiosError>>,
) =>
  useQuery<DegreeDocumentsResponse, AxiosError>({
    queryKey: ['userDegrees', userId],
    queryFn: () => getUserDegrees(userId),
    ...options,
  });
