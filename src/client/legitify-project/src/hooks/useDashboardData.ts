import { User } from '@/api/users/user.models';
import { UseQueryOptions, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getAccessRequests,
  getAccessibleCredentials,
  getMyCredentials,
  getRecentIssuedCredentials,
} from '../api/credentials/credential.api';
import {
  AccessRequestsResponse,
  AccessibleCredentialsResponse,
  CredentialDocumentsResponse,
} from '../api/credentials/credential.models';
import { credentialKeys } from '../api/credentials/credential.queries';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
}

interface DashboardData {
  stats: DashboardStats;
  myCredentials?: CredentialDocumentsResponse;
  accessRequests?: AccessRequestsResponse;
  accessibleCredentials?: AccessibleCredentialsResponse;
  recentVerifications?: any[];
  recentIssued?: CredentialDocumentsResponse;
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
      if (user.role === 'holder') {
        // Prefetch my credentials immediately without waiting
        queryClient.prefetchQuery({
          queryKey: credentialKeys.lists(),
          queryFn: () => getMyCredentials(),
        });

        // Prefetch access requests
        queryClient.prefetchQuery({
          queryKey: credentialKeys.requests(),
          queryFn: () => getAccessRequests(),
        });
      }

      if (user.role === 'verifier') {
        // Prefetch accessible credentials
        queryClient.prefetchQuery({
          queryKey: credentialKeys.accessible(),
          queryFn: () => getAccessibleCredentials(),
        });
      }

      if (user.role === 'issuer') {
        // Prefetch recently issued credentials
        queryClient.prefetchQuery({
          queryKey: [...credentialKeys.all, 'recent-issued'],
          queryFn: () => getRecentIssuedCredentials(),
        });
      }
    };

    prefetchData();
  }, [user, queryClient]);

  // Use parallel queries with useQueries for better performance and organization
  const queryResults = useQueries({
    queries: generateQueriesForRole(user),
    combine: (results): CombinedQueryResult => {
      // Transforms the results into a unified dashboard data object
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

  if (user.role === 'holder') {
    queries.push({
      queryKey: credentialKeys.lists(),
      queryFn: () => getMyCredentials() as Promise<CredentialDocumentsResponse>,
      ...commonOptions,
    });

    queries.push({
      queryKey: credentialKeys.requests(),
      queryFn: () => getAccessRequests() as Promise<AccessRequestsResponse>,
      ...commonOptions,
    });
  }

  if (user.role === 'verifier') {
    queries.push({
      queryKey: credentialKeys.accessible(),
      queryFn: () => getAccessibleCredentials() as Promise<AccessibleCredentialsResponse>,
      ...commonOptions,
    });
  }

  if (user.role === 'issuer') {
    queries.push({
      queryKey: [...credentialKeys.all, 'recent-issued'],
      queryFn: () => getRecentIssuedCredentials() as Promise<CredentialDocumentsResponse>,
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
    if (userRole === 'holder') {
      const myCredentialsResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 ||
            (r.data.length > 0 &&
              r.data[0] &&
              'docId' in r.data[0] &&
              'status' in r.data[0] &&
              !('owner' in r.data[0]))),
      ) as QueryResultWithKey<CredentialDocumentsResponse> | undefined;

      // Find access requests by checking for specific properties
      const accessRequestsResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 ||
            (r.data.length > 0 &&
              r.data[0] &&
              'requestId' in r.data[0] &&
              'verifierName' in r.data[0])),
      ) as QueryResultWithKey<AccessRequestsResponse> | undefined;

      if (myCredentialsResult?.data) {
        const myCredentials = myCredentialsResult.data;
        dashboardData.myCredentials = myCredentials;

        // Calculate statistics
        dashboardData.stats.total = myCredentials.length;
        dashboardData.stats.accepted = myCredentials.filter(d => d.status === 'accepted').length;
        dashboardData.stats.pending = myCredentials.filter(d => d.status === 'issued').length;
        dashboardData.stats.rejected = myCredentials.filter(d => d.status === 'denied').length;
      }

      if (accessRequestsResult?.data) {
        dashboardData.accessRequests = accessRequestsResult.data;
      }
    }

    if (userRole === 'verifier') {
      // Find accessible credentials by checking for specific properties
      const accessibleCredentialsResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 ||
            (r.data.length > 0 &&
              r.data[0] &&
              'docId' in r.data[0] &&
              'owner' in r.data[0] &&
              'requestId' in r.data[0])),
      ) as QueryResultWithKey<AccessibleCredentialsResponse> | undefined;

      if (accessibleCredentialsResult?.data) {
        dashboardData.accessibleCredentials = accessibleCredentialsResult.data;
        dashboardData.stats.total = accessibleCredentialsResult.data.length;
        dashboardData.stats.accepted = accessibleCredentialsResult.data.length;
      }
    }

    if (userRole === 'issuer') {
      const recentIssuedResult = results.find(
        r =>
          r.isSuccess &&
          r.data &&
          Array.isArray(r.data) &&
          (r.data.length === 0 ||
            (r.data.length > 0 && r.data[0] && 'docId' in r.data[0] && 'status' in r.data[0])),
      ) as QueryResultWithKey<CredentialDocumentsResponse> | undefined;

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
