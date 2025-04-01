import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { degreeApi } from '../api/degrees/degree.api';
import { degreeKeys } from '../api/degrees/degree.queries';
import { useAuth } from '../contexts/AuthContext';

export const useDashboardData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Force prefetch all required data when the dashboard hook is called
  useEffect(() => {
    if (!user) return;

    const prefetchData = async () => {
      // Prefetch core data based on user role
      if (user.role === 'individual') {
        // Prefetch my degrees immediately without waiting
        queryClient.prefetchQuery({
          queryKey: degreeKeys.lists(),
          queryFn: () => degreeApi.getMyDegrees(),
        });

        // Prefetch access requests
        queryClient.prefetchQuery({
          queryKey: degreeKeys.requests(),
          queryFn: () => degreeApi.getAccessRequests(),
        });
      }

      if (user.role === 'employer') {
        // Prefetch accessible degrees
        queryClient.prefetchQuery({
          queryKey: degreeKeys.accessible(),
          queryFn: () => degreeApi.getAccessibleDegrees(),
        });

        // Prefetch recent verifications
        queryClient.prefetchQuery({
          queryKey: ['recentVerifications'],
          queryFn: () => degreeApi.getRecentVerifications(),
        });
      }

      if (user.role === 'university') {
        // Prefetch recently issued degrees
        queryClient.prefetchQuery({
          queryKey: ['recentIssued'],
          queryFn: () => degreeApi.getRecentIssuedDegrees(),
        });
      }
    };

    prefetchData();
  }, [user, queryClient]);

  // This main query now directly calls the backend APIs instead of relying on other queries
  return useQuery({
    queryKey: ['dashboardData', user?.id, user?.role],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Base data structure that will be enhanced based on role
      const dashboardData: any = {
        stats: {
          total: 0,
          accepted: 0,
          pending: 0,
          rejected: 0,
        },
      };

      // Perform direct data fetching without relying on other queries
      try {
        if (user.role === 'individual') {
          // Fetch directly from API
          const myDegrees = await degreeApi.getMyDegrees();
          dashboardData.myDegrees = myDegrees || [];

          // Calculate statistics
          if (myDegrees && myDegrees.length > 0) {
            dashboardData.stats.total = myDegrees.length;
            dashboardData.stats.accepted = myDegrees.filter(
              (d: any) => d.status === 'accepted',
            ).length;
            dashboardData.stats.pending = myDegrees.filter(
              (d: any) => d.status === 'issued',
            ).length;
            dashboardData.stats.rejected = myDegrees.filter(
              (d: any) => d.status === 'denied',
            ).length;
          }

          // Fetch access requests
          const accessRequests = await degreeApi.getAccessRequests();
          dashboardData.accessRequests = accessRequests || [];
        }

        if (user.role === 'employer') {
          // Fetch accessible degrees directly
          const accessibleDegrees = await degreeApi.getAccessibleDegrees();
          dashboardData.accessibleDegrees = accessibleDegrees || [];

          // Fetch verifications
          try {
            const recentVerifications = await degreeApi.getRecentVerifications();
            dashboardData.recentVerifications = recentVerifications || [];
          } catch (error) {
            console.error('Error fetching recent verifications:', error);
            dashboardData.recentVerifications = [];
          }
        }

        if (user.role === 'university') {
          // Fetch recent issued degrees directly
          const recentIssued = await degreeApi.getRecentIssuedDegrees();
          dashboardData.recentIssued = recentIssued || [];

          // Calculate statistics
          if (recentIssued && recentIssued.length > 0) {
            dashboardData.stats.total = recentIssued.length;
            dashboardData.stats.accepted = recentIssued.filter(
              (d: any) => d.status === 'accepted',
            ).length;
            dashboardData.stats.pending = recentIssued.filter(
              (d: any) => d.status === 'issued',
            ).length;
            dashboardData.stats.rejected = recentIssued.filter(
              (d: any) => d.status === 'denied',
            ).length;
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Don't throw, so partial data can still be shown
      }

      return dashboardData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Enable refetch on window focus
    retry: 2, // Retry failed requests
  });
};
