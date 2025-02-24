import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "./auth.api";
import { LoginResponse, RegisterData, UserProfile } from "./auth.models";

export const authKeys = {
  profile: () => ["auth", "profile"] as const,
};

export const useRegister = () =>
  useMutation<{ message: string }, Error, RegisterData>({
    mutationFn: (data) => authApi.register(data),
  });

export const useLogin = () =>
  useMutation<LoginResponse, Error, { email: string; password: string }>({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onError: (error) => {
      console.error("Login mutation error:", error);
      throw error;
    },
  });

export const useLogout = () =>
  useMutation<void, Error, void>({
    mutationFn: () => authApi.logout(),
  });

export const useProfile = (enabled = true) =>
  useQuery<UserProfile>({
    queryKey: authKeys.profile(),
    queryFn: () => authApi.getProfile(),
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
