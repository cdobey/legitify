import { useAuth } from '../contexts/AuthContext';

export const useUser = () => {
  const auth = useAuth();

  return {
    user: auth.user,
    isAuthenticated: !!auth.user,
    isLoading: auth.isLoading,
  };
};
