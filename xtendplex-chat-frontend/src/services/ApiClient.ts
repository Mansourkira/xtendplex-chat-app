import axios from "axios";
import AuthService from "./AuthService";

const API_URL = "http://localhost:3000/api";

// Track token refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshCooldown = false;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN_MS = 10000; // 10 seconds cooldown

class ApiClient {
  private static instance: ApiClient;
  private api: any;

  private constructor() {
    // Create axios instance
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for auth
    this.api.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem("access_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh token yet
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          localStorage.getItem("refresh_token") &&
          !isRefreshing &&
          !refreshCooldown
        ) {
          originalRequest._retry = true;

          // Check if we need to wait before refreshing again
          const now = Date.now();
          if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
            console.log(
              "Too many refresh attempts, waiting before trying again"
            );
            refreshCooldown = true;
            setTimeout(() => {
              refreshCooldown = false;
            }, REFRESH_COOLDOWN_MS);
            return Promise.reject(error);
          }

          try {
            isRefreshing = true;
            // Try to refresh the token
            const session = await AuthService.refreshToken();
            lastRefreshTime = Date.now();
            isRefreshing = false;

            if (session) {
              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout the user
            isRefreshing = false;
            refreshCooldown = true;
            setTimeout(() => {
              refreshCooldown = false;
            }, REFRESH_COOLDOWN_MS);

            console.error("Token refresh failed:", refreshError);
            // Only logout if it's a serious auth error, not just rate limit
            if (
              refreshError &&
              typeof refreshError === "object" &&
              "response" in refreshError &&
              refreshError.response &&
              typeof refreshError.response === "object" &&
              "status" in refreshError.response &&
              refreshError.response.status !== 429
            ) {
              AuthService.logout();
            }
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // GET request
  public async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  // POST request
  public async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  // PUT request
  public async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  // DELETE request
  public async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  // PATCH request
  public async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  // Get the axios instance
  public getAxiosInstance(): any {
    return this.api;
  }
}

export default ApiClient.getInstance();
