import apiCall from '../apiCall';
import { DegreeDocumentsResponse } from '../degrees/degree.models';
import { OrgName, ServerUserResponse, User } from './user.models';

export const searchUsers = async (email: string): Promise<User> => {
  const response = await apiCall<ServerUserResponse>({
    method: 'get',
    path: '/user/search',
    params: { email },
  });

  return {
    id: response.uid,
    email: response.email,
    username: response.username,
    orgName: response.orgName as OrgName,
    role: 'individual', // Default to individual since server doesn't return role
  };
};

export const getUserDegrees = (userId: string) =>
  apiCall<DegreeDocumentsResponse>({
    method: 'get',
    path: `/degree/user/${userId}`,
  });
