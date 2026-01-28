import type { LoginRequest, LoginResponse } from '@torre-tempo/shared';
import { useAuthStore } from './store';

// ============================================
// API CLIENT
// ============================================

const API_BASE_URL = '/api';

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }));

      // Handle 401 Unauthorized - clear auth and redirect to login
      if (response.status === 401) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }

      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }
}

// ============================================
// API INSTANCE
// ============================================

export const api = new ApiClient(API_BASE_URL);

// ============================================
// AUTH API
// ============================================

export const authApi = {
  login: (credentials: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', credentials),

  me: () => api.get<LoginResponse>('/auth/me'),

  logout: () => {
    useAuthStore.getState().clearAuth();
  },
};
