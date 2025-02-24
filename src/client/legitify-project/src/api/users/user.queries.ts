import { useMutation, useQuery } from "@tanstack/react-query";
import { degreeApi } from "../degrees/degree.api";
import { DegreeDocument, User } from "../degrees/degree.models";

export const useSearchUser = () =>
  useMutation<User, Error, string>({
    mutationFn: async (email) => degreeApi.searchUsers(email) as Promise<User>,
  });

export const useUserDegrees = (userId: string, options?: any) =>
  useQuery<DegreeDocument[]>({
    queryKey: ["userDegrees", userId],
    queryFn: () => degreeApi.getUserDegrees(userId),
    ...options,
  });
