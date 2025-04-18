import { LoginParams } from '@/api/auth/auth.models';
import { useLoginMutation } from '@/api/auth/auth.mutations';
import { useUserProfileQuery } from '@/api/auth/auth.queries';
import { TwoFactorState, User } from '@/api/users/user.models';
import { queryClient } from '@/config/queryClient';
import axios, { AxiosInstance } from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  api: AxiosInstance;
  twoFactorState: TwoFactorState;
  verifyTwoFactor: (code: string) => Promise<void>;
  clearTwoFactorState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState>({ required: false });

  const loginMutation = useLoginMutation();

  // Create authenticated API instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
  });

  // Add request interceptor to include auth token
  api.interceptors.request.use(
    config => {
      const token = sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error),
  );

  // Initialize the query with enabled:false so it doesn't auto-fetch
  const userProfileQuery = useUserProfileQuery({
    enabled: false,
  });

  // Handle successful profile fetches
  useEffect(() => {
    if (userProfileQuery.data) {
      setUser(userProfileQuery.data);
      sessionStorage.setItem('user', JSON.stringify(userProfileQuery.data));
    }
  }, [userProfileQuery.data]);

  // Handle errors in profile fetching
  useEffect(() => {
    if (userProfileQuery.error) {
      console.error('Error fetching user profile:', userProfileQuery.error);

      // Try to recover from storage if API call fails
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser) as User);
        } catch (e) {
          console.error('Failed to parse saved user data:', e);
          sessionStorage.removeItem('user');
        }
      }
    }
  }, [userProfileQuery.error]);

  const fetchUserProfile = async (): Promise<void> => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      // Use the refetch function from useUserProfileQuery
      await userProfileQuery.refetch();
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchUserProfile();
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return false;

      // If we can fetch the profile, the session is valid
      const { isSuccess } = await userProfileQuery.refetch();
      return isSuccess;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('token');
        if (token) {
          await userProfileQuery.refetch();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const params: LoginParams = { email, password };
    const response = await loginMutation.mutateAsync(params);

    // Handle two-factor authentication
    if (response.requiresTwoFactor && response.tempToken && response.userId) {
      setTwoFactorState({
        required: true,
        tempToken: response.tempToken,
        userId: response.userId,
        email: email,
        password: password,
      });
      // Return without completing login - will be handled by verifyTwoFactor
      return;
    }

    // Regular login flow
    if (response.token) {
      sessionStorage.setItem('token', response.token);

      // Wait for profile to be fetched and user to be set
      try {
        const { data } = await userProfileQuery.refetch();

        if (data) {
          // Update state directly to avoid timing issues
          setUser(data);
          sessionStorage.setItem('user', JSON.stringify(data));
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile during login:', error);
        throw new Error('Failed to complete login process');
      }
    }
  };

  // Verify two-factor authentication code
  const verifyTwoFactor = async (code: string): Promise<void> => {
    if (!twoFactorState.required || !twoFactorState.email || !twoFactorState.password) {
      throw new Error('Two-factor authentication not initiated');
    }

    // Call login again with the verification code
    const params: LoginParams = {
      email: twoFactorState.email,
      password: twoFactorState.password,
      twoFactorCode: code,
    };

    const response = await loginMutation.mutateAsync(params);

    if (response.token) {
      // Clear two-factor state
      setTwoFactorState({ required: false });

      // Complete login
      sessionStorage.setItem('token', response.token);

      try {
        const { data } = await userProfileQuery.refetch();

        if (data) {
          setUser(data);
          sessionStorage.setItem('user', JSON.stringify(data));
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile during 2FA verification:', error);
        throw new Error('Failed to complete login process');
      }
    }
  };

  const clearTwoFactorState = () => {
    setTwoFactorState({ required: false });
  };

  const logout = async (): Promise<void> => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    clearTwoFactorState();
    queryClient.clear();

    navigate('/');
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
    refreshSession,
    api,
    twoFactorState,
    verifyTwoFactor,
    clearTwoFactorState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
