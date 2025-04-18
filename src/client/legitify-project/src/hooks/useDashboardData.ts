import { User } from '@/api/users/user.models';
import { UseQueryOptions, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getAccessRequests,
  getAccessibleDegrees,
  getMyDegrees,
  getRecentIssuedDegrees,
} from '../api/degrees/degree.api';
import {
  AccessRequestsResponse,
  AccessibleDegreesResponse,
  DegreeDocumentsResponse,
} from '../api/degrees/degree.models';
import { degreeKeys } from '../api/degrees/degree.queries';
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

interface QueryResultWithKey<T> {
  data?: T;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  queryKey?: readonly unknown[];
}
interface CombinedQueryResult {
  isLoading: boolean;
  isError: boolean;
  error: Error | null | undefined;
  data: DashboardData;
  refetch: () => Promise<void>;
}

export const useDashboardData = () => {
  const { user } = useAuth() as { user: User | null };
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
const generateQueriesForRole = (user: User | null): UseQueryOptions[] => {
  if (!user) return [];

  const commonOptions = {
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
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

  // Check for any successful results
  if (results.some(result => result.isSuccess)) {
    if (userRole === 'individual') {
      // Find my degrees data by checking for array data with expected properties
      const myDegreesResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 || // Empty array is valid
            (r.data.length > 0 &&
              r.data[0] &&
              'docId' in r.data[0] &&
              'status' in r.data[0] &&
              !('owner' in r.data[0]))), // To differentiate from accessible degrees
      ) as QueryResultWithKey<DegreeDocumentsResponse> | undefined;

      // Find access requests by checking for specific properties
      const accessRequestsResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 || // Empty array is valid
            (r.data.length > 0 &&
              r.data[0] &&
              'requestId' in r.data[0] &&
              'employerName' in r.data[0])),
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
      // Find accessible degrees by checking for specific properties
      const accessibleDegreesResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 || // Empty array is valid
            (r.data.length > 0 &&
              r.data[0] &&
              'docId' in r.data[0] &&
              'owner' in r.data[0] &&
              'requestId' in r.data[0])), // Accessible degrees have requestId and owner properties
      ) as QueryResultWithKey<AccessibleDegreesResponse> | undefined;
    }

    if (userRole === 'university') {
      // Find recent issued degrees by checking for specific properties
      const recentIssuedResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 || // Empty array is valid
            (r.data.length > 0 && r.data[0] && 'docId' in r.data[0] && 'status' in r.data[0])),
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
