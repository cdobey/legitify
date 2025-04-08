import axios, { AxiosInstance } from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, logout as apiLogout, getProfile } from '../api/auth/auth.api';
import { LoginParams } from '../api/auth/auth.models';
import { AuthUser } from '../api/users/user.models';

// Simplified context type
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchUserProfile = async (): Promise<void> => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const profile = await getProfile();
      setUser(profile);
      sessionStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error('Error fetching user profile:', error);

      // Try to recover from storage if API call fails
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser) as AuthUser);
        } catch (e) {
          console.error('Failed to parse saved user data:', e);
          sessionStorage.removeItem('user');
        }
      }
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
      await getProfile();
      return true;
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
        await fetchUserProfile();
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
    const response = await apiLogin(params);

    if (response.token) {
      sessionStorage.setItem('token', response.token);
      await fetchUserProfile();
    }
  };

  const logout = async (): Promise<void> => {
    const token = sessionStorage.getItem('token');

    if (token) {
      try {
        await apiLogout(token);
      } catch (error) {
        // Non-critical error, just log it
        console.error('Logout API error:', error);
      }
    }

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
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
