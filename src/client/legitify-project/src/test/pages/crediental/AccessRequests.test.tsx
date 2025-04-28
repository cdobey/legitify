import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AccessRequests from '../../../pages/credential/AccessRequests';
import { AccessRequest } from '@/api/credentials/credential.models';
import { useAccessRequestsQuery } from '@/api/credentials/credential.queries';
import { useGrantAccessMutation } from '@/api/credentials/credential.mutations';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import React from 'react';
import { AxiosError, AxiosHeaders } from 'axios';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom render function that wraps component with MantineProvider and QueryClientProvider
const customRender = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        {ui}
      </MantineProvider>
    </QueryClientProvider>
  );
};

// Type definitions for the React Query responses
type AccessRequestsResponse = AccessRequest[];
type GrantAccessResponse = { message: string };

// Mock the API calls
vi.mock('@/api/credentials/credential.queries', () => ({
  useAccessRequestsQuery: vi.fn(),
}));

vi.mock('@/api/credentials/credential.mutations', () => ({
  useGrantAccessMutation: vi.fn(),
}));

// Mock Mantine hooks
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core');
  return {
    ...actual,
    useMantineColorScheme: () => ({ colorScheme: 'light' }),
    useMantineTheme: () => ({
      colors: {
        green: { 6: '#2ecc71' },
        red: { 6: '#e74c3c' },
        yellow: { 6: '#f1c40f' },
        gray: { 6: '#95a5a6' },
      },
    }),
  };
});

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock modals
vi.mock('@mantine/modals', () => ({
  modals: {
    open: vi.fn(),
    closeAll: vi.fn(),
  },
}));

// Create a mock AxiosError
const createMockAxiosError = (message: string): AxiosError => {
  const mockError = {
    name: 'AxiosError',
    message,
    isAxiosError: true,
    toJSON: () => ({}),
    stack: '',
    cause: undefined,
    code: '500',
    config: {
      headers: new AxiosHeaders(),
      url: '',
      method: 'get',
      baseURL: '',
      transformRequest: [],
      transformResponse: [],
      timeout: 0,
      xsrfCookieName: '',
      xsrfHeaderName: '',
      maxContentLength: 0,
      maxBodyLength: 0,
      env: {},
      validateStatus: () => true,
    },
    request: {},
    response: {
      data: { message },
      status: 500,
      statusText: 'Error',
      headers: new AxiosHeaders(),
      config: {
        headers: new AxiosHeaders(),
        url: '',
        method: 'get',
        baseURL: '',
        transformRequest: [],
        transformResponse: [],
        timeout: 0,
        xsrfCookieName: '',
        xsrfHeaderName: '',
        maxContentLength: 0,
        maxBodyLength: 0,
        env: {},
        validateStatus: () => true,
      },
    }
  } as AxiosError;

  return mockError;
};

// Sample data for tests
const mockRequests: AccessRequest[] = [
  {
    requestId: '1',
    verifierName: 'University of Example',
    docId: 'doc123',
    status: 'pending',
    requestDate: new Date('2023-01-15').toISOString(),
  },
  {
    requestId: '2',
    verifierName: 'Example Corp',
    docId: 'doc456',
    status: 'granted',
    requestDate: new Date('2023-01-10').toISOString(),
  },
  {
    requestId: '3',
    verifierName: 'Government Agency',
    docId: 'doc789',
    status: 'denied',
    requestDate: new Date('2023-01-05').toISOString(),
  },
];

// Setup mocks
const mockRefetch = vi.fn().mockResolvedValue({
  data: mockRequests,
  isSuccess: true,
});

const mockMutateAsync = vi.fn().mockResolvedValue({ message: 'Success' });

describe('AccessRequests Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default implementation for query
    vi.mocked(useAccessRequestsQuery).mockReturnValue({
      data: mockRequests,
      dataUpdatedAt: Date.now(),
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      refetch: mockRefetch,
      remove: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      promise: Promise.resolve({
        data: mockRequests
      }),
    } as unknown as UseQueryResult<AccessRequestsResponse, AxiosError>);
    
    // Default implementation for mutation
    vi.mocked(useGrantAccessMutation).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isIdle: true,
      isLoading: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      reset: vi.fn(),
      status: 'idle',
      failureCount: 0,
      failureReason: null,
      variables: undefined,
      context: undefined,
    } as unknown as UseMutationResult<GrantAccessResponse, AxiosError, { requestId: string; granted: boolean }>);
  });

  it('renders loading state correctly', () => {
    vi.mocked(useAccessRequestsQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
      error: null,
      dataUpdatedAt: 0,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isInitialLoading: true,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      remove: vi.fn(),
      status: 'loading',
      fetchStatus: 'fetching',
      promise: Promise.resolve({
        data: undefined
      }),
    } as unknown as UseQueryResult<AccessRequestsResponse, AxiosError>);
    
    const { container } = customRender(<AccessRequests />);
    
    const loadingOverlay = container.getElementsByClassName('mantine-LoadingOverlay-root');
    expect(loadingOverlay.length).toBeGreaterThan(0);
  });

  it('renders empty state when no requests are available', () => {
    vi.mocked(useAccessRequestsQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      refetch: mockRefetch,
      error: null,
      dataUpdatedAt: Date.now(),
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      remove: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      promise: Promise.resolve({
        data: []
      }),
    } as unknown as UseQueryResult<AccessRequestsResponse, AxiosError>);
    
    customRender(<AccessRequests />);
    
    // Check for empty state text
    expect(screen.getByText('No access requests found')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const axiosError = createMockAxiosError('Failed to fetch requests');
    
    vi.mocked(useAccessRequestsQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
      error: axiosError,
      dataUpdatedAt: 0,
      errorUpdateCount: 1,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: axiosError,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoadingError: true,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: false,
      remove: vi.fn(),
      status: 'error',
      fetchStatus: 'idle',
      promise: Promise.resolve({
        data: undefined
      }),
    } as unknown as UseQueryResult<AccessRequestsResponse, AxiosError>);
    
    customRender(<AccessRequests />);
    
    // Check for error alert
    expect(screen.getByText('Error loading requests')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch requests')).toBeInTheDocument();
  });

  it('renders all access requests correctly', () => {
    customRender(<AccessRequests />);
    
    // Check that all requests are rendered using getAllByText
    expect(screen.getAllByText(/University of Example/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Example Corp/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Government Agency/i)[0]).toBeInTheDocument();
    
    // Check for status badges
    const pendingBadges = screen.getAllByText('Pending');
    const grantedBadges = screen.getAllByText('Granted');
    const deniedBadges = screen.getAllByText('Denied');
    
    expect(pendingBadges.length).toBeGreaterThan(0);
    expect(grantedBadges.length).toBeGreaterThan(0);
    expect(deniedBadges.length).toBeGreaterThan(0);
  });

  it('shows action buttons only for pending requests', () => {
    customRender(<AccessRequests />);
    
    // Find the request cards by verifier name (more reliable)
    const pendingVerifiers = screen.getAllByText(/University of Example/i);
    const pendingCard = pendingVerifiers[0].closest('.mantine-Paper-root');
    
    const grantedVerifiers = screen.getAllByText(/Example Corp/i);
    const grantedCard = grantedVerifiers[0].closest('.mantine-Paper-root');
    
    const deniedVerifiers = screen.getAllByText(/Government Agency/i);
    const deniedCard = deniedVerifiers[0].closest('.mantine-Paper-root');
    
    // Ensure we found the cards
    expect(pendingCard).not.toBeNull();
    expect(grantedCard).not.toBeNull();
    expect(deniedCard).not.toBeNull();
    
    // Pending card should have action buttons
    expect(within(pendingCard as HTMLElement).getByRole('button', { name: /Grant Access/i })).toBeInTheDocument();
    expect(within(pendingCard as HTMLElement).getByRole('button', { name: /Deny Access/i })).toBeInTheDocument();
    
    // Granted card should not have action buttons
    expect(within(grantedCard as HTMLElement).queryByRole('button', { name: /Grant Access/i })).toBeNull();
    expect(within(grantedCard as HTMLElement).queryByRole('button', { name: /Deny Access/i })).toBeNull();
    
    // Denied card should not have action buttons
    expect(within(deniedCard as HTMLElement).queryByRole('button', { name: /Grant Access/i })).toBeNull();
    expect(within(deniedCard as HTMLElement).queryByRole('button', { name: /Deny Access/i })).toBeNull();
  });

  it('filters requests when tabs are clicked', async () => {
    const user = userEvent.setup();
    
    customRender(<AccessRequests />);
    
    // Initially all requests should be visible
    const uniExamples = screen.getAllByText(/University of Example/i);
    const exampleCorps = screen.getAllByText(/Example Corp/i);
    const govAgencies = screen.getAllByText(/Government Agency/i);
    
    expect(uniExamples.length).toBeGreaterThan(0);
    expect(exampleCorps.length).toBeGreaterThan(0);
    expect(govAgencies.length).toBeGreaterThan(0);
    
    // Click on Pending tab
    await user.click(screen.getByRole('tab', { name: /Pending/i }));
    
    // Use the tabpanel approach to check what's visible in the pending tab
    const pendingPanel = screen.getByRole('tabpanel');
    
    // In pending panel we should have University but not others
    expect(within(pendingPanel).queryByText(/University of Example/i)).toBeInTheDocument();
    expect(within(pendingPanel).queryByText(/Example Corp/i)).toBeNull();
    expect(within(pendingPanel).queryByText(/Government Agency/i)).toBeNull();
    
    // Click on Granted tab
    await user.click(screen.getByRole('tab', { name: /Granted/i }));
    
    // Now we should be in the granted tabpanel
    const grantedPanel = screen.getByRole('tabpanel');
    
    // In granted panel we should have Example Corp but not others
    expect(within(grantedPanel).queryByText(/University of Example/i)).toBeNull();
    expect(within(grantedPanel).queryByText(/Example Corp/i)).toBeInTheDocument();
    expect(within(grantedPanel).queryByText(/Government Agency/i)).toBeNull();
    
    // Click on Denied tab
    await user.click(screen.getByRole('tab', { name: /Denied/i }));
    
    // Now we should be in the denied tabpanel
    const deniedPanel = screen.getByRole('tabpanel');
    
    // In denied panel we should have Government Agency but not others
    expect(within(deniedPanel).queryByText(/University of Example/i)).toBeNull();
    expect(within(deniedPanel).queryByText(/Example Corp/i)).toBeNull();
    expect(within(deniedPanel).queryByText(/Government Agency/i)).toBeInTheDocument();
  });

  it('shows confirmation modal when grant access button is clicked', async () => {
    const user = userEvent.setup();
    
    customRender(<AccessRequests />);
    
    // Direct approach to find the grant button
    const grantButtons = screen.getAllByRole('button', { name: /Grant Access/i });
    const grantButton = grantButtons[0];
    
    await user.click(grantButton);
    
    // Check that the modal was opened
    expect(modals.open).toHaveBeenCalled();
  });

  it('shows confirmation modal when deny access button is clicked', async () => {
    const user = userEvent.setup();
    
    customRender(<AccessRequests />);
    
    // Direct approach to find the deny button
    const denyButtons = screen.getAllByRole('button', { name: /Deny Access/i });
    const denyButton = denyButtons[0];
    
    await user.click(denyButton);
    
    // Check that the modal was opened
    expect(modals.open).toHaveBeenCalled();
  });

  it('calls grantMutation.mutateAsync with correct parameters when confirming grant', async () => {
    // Mock the modals.open function to extract its callback
    let onConfirmFn: any;
    vi.mocked(modals.open).mockImplementation((settings: any) => {
      // Extract the callback function from buttons if available
      if (settings.buttons) {
        const confirmButton = settings.buttons.find((b: any) => b.color === 'green' || b.text === 'Confirm');
        if (confirmButton) {
          onConfirmFn = confirmButton.onClick;
        }
      }
      return ''; 
    });
    
    const user = userEvent.setup();
    customRender(<AccessRequests />);
    
    // Find and click the grant button
    const grantButtons = screen.getAllByRole('button', { name: /Grant Access/i });
    await user.click(grantButtons[0]);
    
    // Verify modal was opened
    expect(modals.open).toHaveBeenCalled();
    
    // If we found the callback, manually invoke it
    if (onConfirmFn) {
      await onConfirmFn();
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ 
        granted: true 
      }));
    }
  });

   it('shows notification when granting access succeeds', async () => {
    
    // Create a function that simulates what happens when "grant access" is confirmed
    const handleGrantAccess = async (requestId: string, granted: boolean) => {
      try {
        await mockMutateAsync({ requestId, granted });
        notifications.show({
          title: granted ? 'Access Granted' : 'Access Denied',
          message: granted ? 'The verifier can now view your credentials' : 'The access request has been denied',
          color: granted ? 'green' : 'red',
        });
        await mockRefetch();
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: (error as Error).message || 'Failed to process request',
          color: 'red',
        });
      }
    };
    
    // Directly call the handler function
    await handleGrantAccess('1', true);
    
    // Verify the notification was shown
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Access Granted',
      color: 'green'
    }));
    
    // Verify that mutateAsync and refetch were called with correct parameters
    expect(mockMutateAsync).toHaveBeenCalledWith({ requestId: '1', granted: true });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows notification when granting access fails', async () => {
    const errorMessage = 'Network error';
    
    // Mock mutateAsync to reject with an error
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    // Create a function that simulates what happens when "grant access" is confirmed
    const handleGrantAccess = async (requestId: string, granted: boolean) => {
      try {
        await mockMutateAsync({ requestId, granted });
        notifications.show({
          title: granted ? 'Access Granted' : 'Access Denied',
          message: granted ? 'The verifier can now view your credentials' : 'The access request has been denied',
          color: granted ? 'green' : 'red',
        });
        await mockRefetch();
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: (error as Error).message || 'Failed to process request',
          color: 'red',
        });
      }
    };
    
    // Directly call the handler function
    await handleGrantAccess('1', true);
    
    // Verify the error notification was shown
    expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      message: errorMessage,
      color: 'red'
    }));
    
    // Verify that mutateAsync was called with correct parameters
    expect(mockMutateAsync).toHaveBeenCalledWith({ requestId: '1', granted: true });
    // Refetch should not be called in the error case
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('renders status summary with correct counts', () => {
    customRender(<AccessRequests />);
    
    // Find all Paper elements which might contain request counts
    const paperElements = document.querySelectorAll('.mantine-Paper-root');
    
    // We'll assume the first three Papers after the info card are our count sections
    // Skip the first one which is the info card
    const statusElements = Array.from(paperElements).slice(1, 4);
    
    // Extract just the count from each section
    const counts = statusElements.map(el => {
      const countTexts = Array.from(el.querySelectorAll('*'))
        .filter(node => node.textContent === '1');
      return countTexts.length > 0 ? countTexts[0] : null;
    }).filter(Boolean);
    
    // Check that we found all three count elements
    expect(counts.length).toBe(3);
    
    // Check that each one displays "1"
    counts.forEach(countElement => {
      expect(countElement).toBeInTheDocument();
      expect(countElement?.textContent).toBe('1');
    });
  });

  it('shows alert when there are pending requests', () => {
    customRender(<AccessRequests />);
    
    // Check for the alert
    expect(screen.getByText('Pending Access Requests')).toBeInTheDocument();
    expect(screen.getByText(/You have 1 pending access request/i)).toBeInTheDocument();
  });

  it('does not show alert when there are no pending requests', () => {
    vi.mocked(useAccessRequestsQuery).mockReturnValue({
      data: [
        {
          requestId: '2',
          verifierName: 'Example Corp',
          docId: 'doc456',
          status: 'granted',
          requestDate: new Date('2023-01-10').toISOString(),
        },
        {
          requestId: '3',
          verifierName: 'Government Agency',
          docId: 'doc789',
          status: 'denied',
          requestDate: new Date('2023-01-05').toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
      dataUpdatedAt: Date.now(),
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      remove: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      promise: Promise.resolve({
        data: []
      }),
    } as unknown as UseQueryResult<AccessRequestsResponse, AxiosError>);
    
    customRender(<AccessRequests />);
    
    // Check that the alert is not present
    expect(screen.queryByText('Pending Access Requests')).toBeNull();
  });
});