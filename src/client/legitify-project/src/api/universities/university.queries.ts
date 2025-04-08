import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  getAllUniversities,
  getMyUniversities,
  getPendingAffiliations,
  getStudentUniversities,
  getUniversityPendingAffiliations,
} from './university.api';
import { AffiliationsResponse, UniversitiesResponse } from './university.models';

export const universityKeys = {
  all: ['universities'] as const,
  lists: () => [...universityKeys.all, 'list'] as const,
  my: () => [...universityKeys.all, 'my'] as const,
  all_universities: () => [...universityKeys.all, 'all'] as const,
  pending: (universityId: string) => [...universityKeys.all, 'pending', universityId] as const,
  studentAffiliations: () => [...universityKeys.all, 'student-affiliations'] as const,
  pendingAffiliations: () => [...universityKeys.all, 'pending-affiliations'] as const,
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

export const useUniversityPendingAffiliationsQuery = (
  universityId: string,
  options?: Partial<UseQueryOptions<AffiliationsResponse, AxiosError>>,
) =>
  useQuery<AffiliationsResponse, AxiosError>({
    queryKey: universityKeys.pending(universityId),
    queryFn: () => getUniversityPendingAffiliations(universityId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!universityId,
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
