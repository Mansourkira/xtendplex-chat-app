import apiClient from "./ApiClient";
import { UserStatus } from "./AuthService";

export interface User {
  id: string;
  username: string;
  email: string;
  status?: "online" | "offline" | "away" | "busy";
  password?: string;
  role?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  avatar?: string;
  status?: UserStatus;
  role?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  avatar: string;
  status: UserStatus;
  role: string;
}

const UserService = {
  // Get all users
  getUsers: async (
    page = 1,
    limit = 100
  ): Promise<{ users: User[]; total: number }> => {
    const response = await apiClient.get<User[]>("/users");
    return {
      users: response,
      total: response.length,
    };
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    return apiClient.get<User>(`/users/${userId}`);
  },

  // Update user
  updateUser: async (
    userId: string,
    userData: UpdateUserRequest
  ): Promise<User> => {
    return apiClient.put<User>(`/users/${userId}`, userData);
  },

  // update current user
  updateCurrentUser: async (userData: UpdateUserRequest): Promise<User> => {
    localStorage.setItem("user", JSON.stringify(userData));
    return apiClient.put<User>("/users/current", userData);
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    return apiClient.delete(`/users/${userId}`);
  },

  // Update user status
  updateStatus: async (
    status: UserStatus
  ): Promise<{ message: string; status: string }> => {
    return apiClient.put<{ message: string; status: string }>("/users/status", {
      status,
    });
  },

  // Search users by username
  searchUsers: async (query: string): Promise<User[]> => {
    return apiClient.get<User[]>(`/users/search/${query}`);
  },

  // Get all users for chat (excluding current user)
  getChatUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>("/users/chat-users");
  },

  // Create a new user
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    return apiClient.post<User>("/users/create", userData);
  },
};

export default UserService;
