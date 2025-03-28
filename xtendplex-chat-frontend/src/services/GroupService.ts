import apiClient from "./ApiClient";
import { User } from "./UserService";

// Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_direct_message: boolean;
  last_message?: {
    content: string;
    user_id: string;
    created_at: string;
  };
  members?: GroupMember[];
}

export interface GroupMember {
  user_id: string;
  group_id: string;
  role: "admin" | "member";
  joined_at: string;
  user?: User;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  avatar?: string;
  memberIds?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatar?: string;
}

const GroupService = {
  // Get all groups for current user
  getGroups: async (): Promise<Group[]> => {
    return apiClient.get<Group[]>("/groups");
  },

  // Get group by ID
  getGroupById: async (groupId: string): Promise<Group> => {
    return apiClient.get<Group>(`/groups/${groupId}`);
  },

  // Create new group
  createGroup: async (groupData: CreateGroupRequest): Promise<Group> => {
    return apiClient.post<Group>("/groups", groupData);
  },

  // Update group
  updateGroup: async (
    groupId: string,
    groupData: UpdateGroupRequest
  ): Promise<Group> => {
    return apiClient.put<Group>(`/groups/${groupId}`, groupData);
  },

  // Delete group
  deleteGroup: async (groupId: string): Promise<void> => {
    return apiClient.delete(`/groups/${groupId}`);
  },

  // Add members to group
  addMembers: async (groupId: string, userIds: string[]): Promise<Group> => {
    return apiClient.post<Group>(`/groups/${groupId}/members`, { userIds });
  },

  // Remove member from group
  removeMember: async (groupId: string, userId: string): Promise<void> => {
    return apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  // Update member role
  updateMemberRole: async (
    groupId: string,
    userId: string,
    role: "admin" | "member"
  ): Promise<GroupMember> => {
    return apiClient.put<GroupMember>(`/groups/${groupId}/members/${userId}`, {
      role,
    });
  },
};

export default GroupService;
