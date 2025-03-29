import apiCall from '../apiCall';
import { LoginResponse, RegisterData, UserProfile } from './auth.models';

export const authApi = {
  register: (data: RegisterData) =>
    apiCall<{ message: string }>({
      method: 'post',
      path: '/auth/register',
      params: data,
    }),

  login: async (email: string, password: string) => {
    try {
      // Use server login endpoint instead of direct Supabase
      const response = await apiCall<{
        token: string;
        uid: string;
        expiresIn: number;
        refreshToken: string;
      }>({
        method: 'post',
        path: '/auth/login',
        params: { email, password },
      });

      if (!response || !response.token) {
        throw new Error('Login failed');
      }

      const token = response.token;

      // Store the token in sessionStorage
      sessionStorage.setItem('token', token);

      // Get full user profile from our backend
      const userProfile = await apiCall<UserProfile>({
        method: 'get',
        path: '/me',
        config: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      return {
        user: userProfile,
        token,
      } as LoginResponse;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Invalid login credentials') {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'Failed to login');
    }
  },

  logout: async () => {
    try {
      const token = sessionStorage.getItem('token');

      if (token) {
        // Call server logout endpoint
        await apiCall({
          method: 'post',
          path: '/auth/logout',
          config: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of server response
      sessionStorage.removeItem('token');
    }
  },

  getProfile: () =>
    apiCall<UserProfile>({
      method: 'get',
      path: '/me',
    }),
};
