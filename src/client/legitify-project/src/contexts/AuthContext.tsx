import axios, { AxiosInstance } from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiCall from '../api/apiCall';
import { authApi } from '../api/auth/auth.api';
import { UserProfile } from '../api/auth/auth.models';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  api: AxiosInstance; // Add the api property
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create authenticated API instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Changed from process.env.REACT_APP_API_URL
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

  // Fetch user profile
  const fetchUserProfile = async (): Promise<void> => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const profile = await authApi.getProfile();
      setUser(profile);

      // Store in sessionStorage for recovery
      sessionStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // If profile fetch fails, try to recover from storage
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    await fetchUserProfile();
  };

  // Add a refreshSession method that works with the server API
  const refreshSession = async (): Promise<boolean> => {
    try {
      // Get the current token
      const token = sessionStorage.getItem('token');

      if (!token) {
        return false;
      }

      // Fetch the profile to validate the token
      await authApi.getProfile();

      // If we got here, the token is still valid
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);

      // If there was an error, try to login again if we have stored credentials
      // This is a fallback and might not always work
      try {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
          await refreshUser();
          return true;
        }
      } catch (e) {
        console.error('Failed to recover session:', e);
      }

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

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    const response = await authApi.login({ email, password });
    if (response.token) {
      // Store the token
      sessionStorage.setItem('token', response.token);

      // Fetch the user profile
      await fetchUserProfile();
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        await authApi.logout(token);
      } catch (error) {
        console.error('Logout error:', error);
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
    api, // Include the api instance
    apiCall, // Include the apiCall utility
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
