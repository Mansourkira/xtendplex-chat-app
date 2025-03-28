import apiClient from "./ApiClient";

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  status?: string;
  role?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  status?: string;
  role?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  session: Session;
}

// Status type
export type UserStatus = "online" | "offline" | "away";

const AuthService = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>("/auth/register", credentials);
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials
    );

    // Save tokens to localStorage
    if (response.session) {
      localStorage.setItem("access_token", response.session.access_token);
      localStorage.setItem("refresh_token", response.session.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await apiClient.get<User>("/auth/me");
    } catch (_error) {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("access_token");
  },

  refreshToken: async (): Promise<Session | null> => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await apiClient.post<{ session: Session }>(
        "/auth/refresh",
        {
          refresh_token: refreshToken,
        },
        {
          // Don't retry this request to avoid infinite loops
          skipRetry: true,
        }
      );

      // Update tokens in localStorage
      if (response.session) {
        localStorage.setItem("access_token", response.session.access_token);
        localStorage.setItem("refresh_token", response.session.refresh_token);
        return response.session;
      }

      return null;
    } catch (error) {
      // If we hit a rate limit, don't clear tokens - just return null
      const axiosError = error as any;
      if (axiosError.response?.status === 429) {
        console.warn("Token refresh rate limited. Will try again later.");
        return null;
      }

      // For other errors, clear tokens
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return null;
    }
  },

  updateStatus: async (
    status: UserStatus
  ): Promise<{ message: string; status: string }> => {
    try {
      return await apiClient.patch<{ message: string; status: string }>(
        "/auth/status",
        { status }
      );
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  },
};

export default AuthService;
