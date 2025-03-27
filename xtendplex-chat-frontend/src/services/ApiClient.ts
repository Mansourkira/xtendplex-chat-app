import axios from "axios";
import AuthService from "./AuthService";

const API_URL = "http://localhost:3000/api";

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
          localStorage.getItem("refresh_token")
        ) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token
            const session = await AuthService.refreshToken();

            if (session) {
              // Update the original request with new token
              originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout the user
            AuthService.logout();
            return Promise.reject(refreshError);
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
