import { UseQueryOptions, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getAccessRequests,
  getAccessibleDegrees,
  getMyDegrees,
  getRecentIssuedDegrees,
  getRecentVerifications,
} from '../api/degrees/degree.api';
import {
  AccessRequestsResponse,
  AccessibleDegreesResponse,
  DegreeDocumentsResponse,
} from '../api/degrees/degree.models';
import { degreeKeys } from '../api/degrees/degree.queries';
import { AuthUser } from '../api/users/user.models';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
}

interface DashboardData {
  stats: DashboardStats;
  myDegrees?: DegreeDocumentsResponse;
  accessRequests?: AccessRequestsResponse;
  accessibleDegrees?: AccessibleDegreesResponse;
  recentVerifications?: any[];
  recentIssued?: DegreeDocumentsResponse;
}

// Type for the query result
interface QueryResultWithKey<T> {
  data?: T;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  queryKey?: readonly unknown[]; // Make queryKey optional
}

// Type for the combined result
interface CombinedQueryResult {
  isLoading: boolean;
  isError: boolean;
  error: Error | null | undefined;
  data: DashboardData;
  refetch: () => Promise<void>; // Add refetch function
}

export const useDashboardData = () => {
  const { user } = useAuth() as { user: AuthUser | null };
  const queryClient = useQueryClient();

  // Prefetch data when the component mounts or user changes
  useEffect(() => {
    if (!user) return;

    const prefetchData = async () => {
      // Prefetch core data based on user role
      if (user.role === 'individual') {
        // Prefetch my degrees immediately without waiting
        queryClient.prefetchQuery({
          queryKey: degreeKeys.lists(),
          queryFn: () => getMyDegrees(),
        });

        // Prefetch access requests
        queryClient.prefetchQuery({
          queryKey: degreeKeys.requests(),
          queryFn: () => getAccessRequests(),
        });
      }

      if (user.role === 'employer') {
        // Prefetch accessible degrees
        queryClient.prefetchQuery({
          queryKey: degreeKeys.accessible(),
          queryFn: () => getAccessibleDegrees(),
        });

        // Prefetch recent verifications
        queryClient.prefetchQuery({
          queryKey: [...degreeKeys.all, 'recent-verifications'],
          queryFn: () => getRecentVerifications(),
        });
      }

      if (user.role === 'university') {
        // Prefetch recently issued degrees
        queryClient.prefetchQuery({
          queryKey: [...degreeKeys.all, 'recent-issued'],
          queryFn: () => getRecentIssuedDegrees(),
        });
      }
    };

    prefetchData();
  }, [user, queryClient]);

  // Use parallel queries with useQueries for better performance and organization
  const queryResults = useQueries({
    queries: generateQueriesForRole(user),
    combine: (results): CombinedQueryResult => {
      // Transform the results into a unified dashboard data object
      return {
        isLoading: results.some(result => result.isLoading),
        isError: results.some(result => result.isError),
        error: results.find(result => result.error)?.error,
        data: combineQueryData(results as QueryResultWithKey<unknown>[], user?.role),
        refetch: async () => {
          // Refetch all queries
          await Promise.all(results.map(result => result.refetch()));
        },
      };
    },
  });

  return queryResults;
};

// Helper function to generate the appropriate queries based on user role
const generateQueriesForRole = (user: AuthUser | null): UseQueryOptions[] => {
  if (!user) return [];

  const commonOptions = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !!user,
  };

  const queries: UseQueryOptions[] = [];

  if (user.role === 'individual') {
    queries.push({
      queryKey: degreeKeys.lists(),
      queryFn: () => getMyDegrees() as Promise<DegreeDocumentsResponse>,
      ...commonOptions,
    });

    queries.push({
      queryKey: degreeKeys.requests(),
      queryFn: () => getAccessRequests() as Promise<AccessRequestsResponse>,
      ...commonOptions,
    });
  }

  if (user.role === 'employer') {
    queries.push({
      queryKey: degreeKeys.accessible(),
      queryFn: () => getAccessibleDegrees() as Promise<AccessibleDegreesResponse>,
      ...commonOptions,
    });

    queries.push({
      queryKey: [...degreeKeys.all, 'recent-verifications'],
      queryFn: () => getRecentVerifications() as Promise<any[]>,
      ...commonOptions,
    });
  }

  if (user.role === 'university') {
    queries.push({
      queryKey: [...degreeKeys.all, 'recent-issued'],
      queryFn: () => getRecentIssuedDegrees() as Promise<DegreeDocumentsResponse>,
      ...commonOptions,
    });
  }

  return queries;
};

// Helper function to combine query results into a unified data structure
const combineQueryData = (
  results: QueryResultWithKey<unknown>[],
  userRole?: string,
): DashboardData => {
  const dashboardData: DashboardData = {
    stats: {
      total: 0,
      accepted: 0,
      pending: 0,
      rejected: 0,
    },
  };

  // All queries have succeeded
  if (results.every(result => result.isSuccess)) {
    if (userRole === 'individual') {
      // Update how we find specific queries since queryKey might be undefined
      const myDegreesResult = results.find(
        r =>
          r.data &&
          Array.isArray(r.data) &&
          r.queryKey &&
          Array.isArray(r.queryKey) &&
          r.queryKey.includes('list'),
      ) as QueryResultWithKey<DegreeDocumentsResponse> | undefined;

      const accessRequestsResult = results.find(
        r =>
          r.data &&
          Array.isArray(r.data) &&
          r.queryKey &&
          Array.isArray(r.queryKey) &&
          r.queryKey.includes('requests'),
      ) as QueryResultWithKey<AccessRequestsResponse> | undefined;

      if (myDegreesResult?.data) {
        const myDegrees = myDegreesResult.data;
        dashboardData.myDegrees = myDegrees;

        // Calculate statistics
        dashboardData.stats.total = myDegrees.length;
        dashboardData.stats.accepted = myDegrees.filter(d => d.status === 'accepted').length;
        dashboardData.stats.pending = myDegrees.filter(d => d.status === 'issued').length;
        dashboardData.stats.rejected = myDegrees.filter(d => d.status === 'denied').length;
      }

      if (accessRequestsResult?.data) {
        dashboardData.accessRequests = accessRequestsResult.data;
      }
    }

    if (userRole === 'employer') {
      const accessibleDegreesResult = results.find(
        r =>
          r.data &&
          Array.isArray(r.data) &&
          r.queryKey &&
          Array.isArray(r.queryKey) &&
          r.queryKey.includes('accessible'),
      ) as QueryResultWithKey<AccessibleDegreesResponse> | undefined;

      const verificationsResult = results.find(
        r =>
          r.data &&
          Array.isArray(r.data) &&
          r.queryKey &&
          Array.isArray(r.queryKey) &&
          r.queryKey.includes('recent-verifications'),
      ) as QueryResultWithKey<any[]> | undefined;

      if (accessibleDegreesResult?.data) {
        dashboardData.accessibleDegrees = accessibleDegreesResult.data;
      }

      if (verificationsResult?.data) {
        dashboardData.recentVerifications = verificationsResult.data;
      }
    }

    if (userRole === 'university') {
      const recentIssuedResult = results.find(
        r =>
          r.data &&
          Array.isArray(r.data) &&
          r.queryKey &&
          Array.isArray(r.queryKey) &&
          r.queryKey.includes('recent-issued'),
      ) as QueryResultWithKey<DegreeDocumentsResponse> | undefined;

      if (recentIssuedResult?.data) {
        const recentIssued = recentIssuedResult.data;
        dashboardData.recentIssued = recentIssued;

        // Calculate statistics
        dashboardData.stats.total = recentIssued.length;
        dashboardData.stats.accepted = recentIssued.filter(d => d.status === 'accepted').length;
        dashboardData.stats.pending = recentIssued.filter(d => d.status === 'issued').length;
        dashboardData.stats.rejected = recentIssued.filter(d => d.status === 'denied').length;
      }
    }
  }

  return dashboardData;
};
