import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../contexts/AuthContext'; 
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';

// Import the missing functions
import { useLoginMutation } from '@/api/auth/auth.mutations';
import { useUserProfileQuery } from '@/api/auth/auth.queries';
import { AxiosError } from 'axios';

// Define interfaces for your data types that match your actual application interfaces
interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  orgName: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any; // For any additional properties
}

interface LoginResponse {
  token?: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  userId?: string;
  expiresIn?: number;
  refreshToken?: string;
  uid?: string;
}

interface LoginParams {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface UserProfileQueryResult {
  data: User | undefined;
  error: AxiosError | null;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<User, AxiosError>>;
  // Add other required properties from QueryObserverResult
  status: 'loading' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  isFetched: boolean;
  isFetchedAfterMount: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isPlaceholderData: boolean;
  isPreviousData: boolean;
  isRefetchError: boolean;
  isStale: boolean;
}

// Mock React Router's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the API calls
vi.mock('@/api/auth/auth.mutations', () => ({
  useLoginMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/api/auth/auth.queries', () => ({
  useUserProfileQuery: () => ({
    data: null,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    isError: false,
    isPending: false,
    isSuccess: false,
    status: 'success',
    fetchStatus: 'idle',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isRefetching: false,
    isPlaceholderData: false,
    isPreviousData: false,
    isRefetchError: false,
    isStale: false,
  }),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    })),
  },
}));

vi.mock('@/config/queryClient', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

// Setup mocks and test variables
const mockNavigate = vi.fn();
const mockLoginMutateAsync = vi.fn<[LoginParams], Promise<LoginResponse>>();
const mockUserProfileRefetch = vi.fn<[RefetchOptions?], Promise<QueryObserverResult<User, AxiosError>>>();
let mockUserProfileData: User | undefined = undefined;
let mockUserProfileError: AxiosError | null = null;

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="loading-state">{auth.isLoading.toString()}</div>
      <div data-testid="user-data">{JSON.stringify(auth.user)}</div>
      <button data-testid="login-button" onClick={() => auth.login('test@example.com', 'password')}>
        Login
      </button>
      <button data-testid="logout-button" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="refresh-user" onClick={() => auth.refreshUser()}>
        Refresh User
      </button>
      <button data-testid="refresh-session" onClick={() => auth.refreshSession()}>
        Refresh Session
      </button>
      <div data-testid="two-factor-state">{JSON.stringify(auth.twoFactorState)}</div>
      <button
        data-testid="verify-2fa-button"
        onClick={() => auth.verifyTwoFactor('123456')}
      >
        Verify 2FA
      </button>
      <button
        data-testid="clear-2fa-button"
        onClick={() => auth.clearTwoFactorState()}
      >
        Clear 2FA
      </button>
    </div>
  );
}

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset session storage
    window.sessionStorage.clear();
    
    // Setup default mock implementations
    mockLoginMutateAsync.mockResolvedValue({ 
      token: 'fake-token',
      expiresIn: 3600,
      refreshToken: 'fake-refresh-token',
      uid: '123'
    });
    
    mockUserProfileRefetch.mockResolvedValue({
      data: { 
        id: '123', 
        email: 'test@example.com', 
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        orgName: 'TestOrg',
        twoFactorEnabled: false,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      },
      isSuccess: true,
      error: null,
      isLoading: false,
      isError: false,
      isPending: false,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isStale: false,
      refetch: mockUserProfileRefetch
    } as QueryObserverResult<User, AxiosError>);
    
    // Override the mocked implementations
    vi.mocked(useLoginMutation).mockReturnValue({
      mutateAsync: mockLoginMutateAsync,
    });
    
    vi.mocked(useUserProfileQuery).mockImplementation((): UserProfileQueryResult => ({
      data: mockUserProfileData,
      error: mockUserProfileError,
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: Boolean(mockUserProfileData),
      refetch: mockUserProfileRefetch,
      status: mockUserProfileError ? 'error' : mockUserProfileData ? 'success' : 'loading',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: mockUserProfileError ? Date.now() : 0,
      failureCount: mockUserProfileError ? 1 : 0,
      isFetched: Boolean(mockUserProfileData || mockUserProfileError),
      isFetchedAfterMount: Boolean(mockUserProfileData || mockUserProfileError),
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: Boolean(mockUserProfileError),
      isStale: false,
    }));
  });

  afterEach(() => {
    mockUserProfileData = undefined;
    mockUserProfileError = null;
  });

  it('should initialize with null user and loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Initially loading should be true
    expect(screen.getByTestId('loading-state').textContent).toBe('true');
    
    // After initialization, loading should be false
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // User should be null initially
    expect(screen.getByTestId('user-data').textContent).toBe('null');
  });

  it('should login successfully and set user data', async () => {
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    
    mockLoginMutateAsync.mockResolvedValueOnce({ 
      token: 'fake-token',
      expiresIn: 3600,
      refreshToken: 'fake-refresh-token',
      uid: '123'
    });
    
    mockUserProfileRefetch.mockResolvedValueOnce({
      data: mockUser,
      isSuccess: true,
      error: null,
      isLoading: false,
      isError: false,
      isPending: false,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isStale: false,
      refetch: mockUserProfileRefetch
    } as QueryObserverResult<User, AxiosError>);
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click login button
    await user.click(screen.getByTestId('login-button'));
    
    // Verify login was called
    expect(mockLoginMutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
    
    // Verify user profile was fetched
    expect(mockUserProfileRefetch).toHaveBeenCalled();
    
    // Wait for user data to be set
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('user-data').textContent || '{}')).toEqual(mockUser);
    });
    
    // Verify token was saved to session storage
    expect(sessionStorage.getItem('token')).toBe('fake-token');
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('should handle two-factor authentication flow', async () => {
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    
    // First login attempt requires 2FA
    mockLoginMutateAsync.mockResolvedValueOnce({
      requiresTwoFactor: true,
      tempToken: 'temp-token',
      userId: '123',
      expiresIn: 300,
      refreshToken: '',
      uid: '123'
    });
    
    // Second login attempt with 2FA code succeeds
    mockLoginMutateAsync.mockResolvedValueOnce({ 
      token: 'final-token',
      expiresIn: 3600,
      refreshToken: 'fake-refresh-token',
      uid: '123'
    });
    
    mockUserProfileRefetch.mockResolvedValueOnce({
      data: mockUser,
      isSuccess: true,
      error: null,
      isLoading: false,
      isError: false,
      isPending: false,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isStale: false,
      refetch: mockUserProfileRefetch
    } as QueryObserverResult<User, AxiosError>);
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click login button to initiate 2FA flow
    await user.click(screen.getByTestId('login-button'));
    
    // Verify login was called
    expect(mockLoginMutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
    
    // Check that 2FA state is set correctly
    await waitFor(() => {
      const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
      expect(twoFactorState.required).toBe(true);
      expect(twoFactorState.tempToken).toBe('temp-token');
      expect(twoFactorState.userId).toBe('123');
    });
    
    // Now verify the 2FA code
    await user.click(screen.getByTestId('verify-2fa-button'));
    
    // Verify login was called again with 2FA code
    expect(mockLoginMutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      twoFactorCode: '123456',
    });
    
    // Verify user profile was fetched
    expect(mockUserProfileRefetch).toHaveBeenCalled();
    
    // Wait for user data to be set
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('user-data').textContent || '{}')).toEqual(mockUser);
    });
    
    // Verify 2FA state is cleared
    await waitFor(() => {
      const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
      expect(twoFactorState.required).toBe(false);
    });
    
    // Verify token was saved to session storage
    expect(sessionStorage.getItem('token')).toBe('final-token');
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('should logout successfully', async () => {
    // First set up a logged in state
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    mockUserProfileData = mockUser;
    
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('user', JSON.stringify(mockUser));
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Wait for user data to be set
    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('user-data').textContent || '{}')).toEqual(mockUser);
    });
    
    // Click logout button
    await user.click(screen.getByTestId('logout-button'));
    
    // Verify navigation was called
    expect(mockNavigate).toHaveBeenCalledWith('/');
    
    // Verify session storage was cleared
    expect(sessionStorage.getItem('token')).toBe(null);
    expect(sessionStorage.getItem('user')).toBe(null);
    
    // Verify user data was cleared
    await waitFor(() => {
      expect(screen.getByTestId('user-data').textContent).toBe('null');
    });
  });

  it('should refresh user profile', async () => {
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    
    const updatedUser: User = { 
      id: '123', 
      email: 'updated@example.com', 
      name: 'Updated User',
      username: 'updateduser',
      role: 'admin',
      orgName: 'UpdatedOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-02-01'
    };
    
    mockUserProfileData = mockUser;
    sessionStorage.setItem('token', 'fake-token');
    
    mockUserProfileRefetch.mockResolvedValueOnce({
      data: updatedUser,
      isSuccess: true,
      error: null,
      isLoading: false,
      isError: false,
      isPending: false,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isStale: false,
      refetch: mockUserProfileRefetch
    } as QueryObserverResult<User, AxiosError>);
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click refresh user button
    await user.click(screen.getByTestId('refresh-user'));
    
    // Verify refetch was called
    expect(mockUserProfileRefetch).toHaveBeenCalled();
    
    // Mock the updated user data
    mockUserProfileData = updatedUser;
    
    // Simulate the useEffect that would happen after refetch
    await act(async () => {
      // This is a hack to trigger the useEffect that depends on userProfileQuery.data
    });
    
    // Updated user data should be reflected
    await waitFor(() => {
      const userData = JSON.parse(screen.getByTestId('user-data').textContent || '{}');
      expect(userData).toEqual(updatedUser);
    });
  });

  it('should handle session refresh', async () => {
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    sessionStorage.setItem('token', 'fake-token');
    
    mockUserProfileRefetch.mockResolvedValueOnce({
      data: mockUser,
      isSuccess: true,
      error: null,
      isLoading: false,
      isError: false,
      isPending: false,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetchError: false,
      isStale: false,
      refetch: mockUserProfileRefetch
    } as QueryObserverResult<User, AxiosError>);
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click refresh session button
    await user.click(screen.getByTestId('refresh-session'));
    
    // Verify refetch was called
    expect(mockUserProfileRefetch).toHaveBeenCalled();
  });

  it('should recover user from session storage if API call fails', async () => {
    const mockUser: User = { 
      id: '123', 
      email: 'test@example.com', 
      name: 'Test User',
      username: 'testuser',
      role: 'user',
      orgName: 'TestOrg',
      twoFactorEnabled: false,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    
    // Set up session storage with a user
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('user', JSON.stringify(mockUser));
    
    // Make the API call fail
    mockUserProfileError = new AxiosError('API Error');
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // User should be recovered from session storage
    await waitFor(() => {
      const userData = JSON.parse(screen.getByTestId('user-data').textContent || '{}');
      expect(userData).toEqual(mockUser);
    });
  });

  it('should clear two-factor state', async () => {
    // Set up 2FA state
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Mock the login function to trigger 2FA
    mockLoginMutateAsync.mockResolvedValueOnce({
      requiresTwoFactor: true,
      tempToken: 'temp-token',
      userId: '123',
      expiresIn: 300,
      refreshToken: '',
      uid: '123'
    });
    
    // Click login button
    await user.click(screen.getByTestId('login-button'));
    
    // Verify 2FA state is set
    await waitFor(() => {
      const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
      expect(twoFactorState.required).toBe(true);
    });
    
    // Clear 2FA state
    await user.click(screen.getByTestId('clear-2fa-button'));
    
    // Verify 2FA state is cleared
    await waitFor(() => {
      const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
      expect(twoFactorState.required).toBe(false);
    });
  });

  it('should handle error in 2FA verification', async () => {
    // Set up 2FA state first
    mockLoginMutateAsync.mockResolvedValueOnce({
      requiresTwoFactor: true,
      tempToken: 'temp-token',
      userId: '123',
      expiresIn: 300,
      refreshToken: '',
      uid: '123'
    });
    
    // Then make the 2FA verification fail
    mockLoginMutateAsync.mockRejectedValueOnce(new Error('Invalid 2FA code'));
    
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
      { wrapper: TestWrapper }
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click login button
    await user.click(screen.getByTestId('login-button'));
    
    // Verify 2FA state is set
    await waitFor(() => {
      const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
      expect(twoFactorState.required).toBe(true);
    });
    
    // Try to verify with 2FA code but it will fail
    await expect(async () => {
      await user.click(screen.getByTestId('verify-2fa-button'));
    }).rejects.toThrow();
    
    // 2FA state should still be set since verification failed
    const twoFactorState = JSON.parse(screen.getByTestId('two-factor-state').textContent || '{}');
    expect(twoFactorState.required).toBe(true);
  });
});