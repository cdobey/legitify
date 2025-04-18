import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  getAllUniversities,
  getMyPendingJoinRequests,
  getMyUniversities,
  getPendingAffiliations,
  getPendingJoinRequests,
  getStudentUniversities,
} from './university.api';
import {
  AffiliationsResponse,
  JoinRequestsResponse,
  UniversitiesResponse,
  University,
} from './university.models';

export const universityKeys = {
  all: ['universities'] as const,
  lists: () => [...universityKeys.all, 'list'] as const,
  my: () => [...universityKeys.all, 'my'] as const,
  all_universities: () => [...universityKeys.all, 'all'] as const,
  pending: (universityId: string) => [...universityKeys.all, 'pending', universityId] as const,
  studentAffiliations: () => [...universityKeys.all, 'student-affiliations'] as const,
  pendingAffiliations: () => [...universityKeys.all, 'pending-affiliations'] as const,
  pendingJoinRequests: () => [...universityKeys.all, 'pending-join-requests'] as const,
  myPendingJoinRequests: () => [...universityKeys.all, 'my-pending-join-requests'] as const,
};

export const useMyUniversitiesQuery = (
  options?: Partial<UseQueryOptions<UniversitiesResponse, AxiosError>>,
) =>
  useQuery<UniversitiesResponse, AxiosError>({
    queryKey: universityKeys.my(),
    queryFn: () => getMyUniversities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    ...options,
  });

export const useAllUniversitiesQuery = (
  options?: Partial<UseQueryOptions<UniversitiesResponse, AxiosError>>,
) =>
  useQuery<UniversitiesResponse, AxiosError>({
    queryKey: universityKeys.all_universities(),
    queryFn: () => getAllUniversities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

export const useStudentUniversitiesQuery = (
  options?: Partial<UseQueryOptions<UniversitiesResponse, AxiosError>>,
) =>
  useQuery<UniversitiesResponse, AxiosError>({
    queryKey: universityKeys.studentAffiliations(),
    queryFn: () => getStudentUniversities(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

export const usePendingAffiliationsQuery = (
  options?: Partial<UseQueryOptions<AffiliationsResponse, AxiosError>>,
) =>
  useQuery<AffiliationsResponse, AxiosError>({
    queryKey: universityKeys.pendingAffiliations(),
    queryFn: () => getPendingAffiliations(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const usePendingJoinRequestsQuery = (
  options?: Partial<UseQueryOptions<JoinRequestsResponse, AxiosError>>,
) =>
  useQuery<JoinRequestsResponse, AxiosError>({
    queryKey: universityKeys.pendingJoinRequests(),
    queryFn: () => getPendingJoinRequests(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const useMyPendingJoinRequestsQuery = (
  options?: Partial<UseQueryOptions<JoinRequestsResponse, AxiosError>>,
) =>
  useQuery<JoinRequestsResponse, AxiosError>({
    queryKey: universityKeys.myPendingJoinRequests(),
    queryFn: () => getMyPendingJoinRequests(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });

export const usePrimaryUniversityQuery = (
  userId?: string,
  role?: 'university' | 'individual',
  options?: Partial<UseQueryOptions<UniversitiesResponse, AxiosError, University | null>>,
) =>
  useQuery<UniversitiesResponse, AxiosError, University | null>({
    queryKey: universityKeys.my(),
    queryFn: getMyUniversities,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: Boolean(userId),
    select: (universities): University | null => {
      if (!universities || universities.length === 0) return null;

      if (role === 'university') {
        const owned = universities.find(u => u.ownerId === userId);
        return owned ?? universities[0];
      }

      return universities[0];
    },
    ...options,
  });
