import { api } from '../client';
import type { AuthResponse, AuthenticatedUser, Envelope } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', payload);
  },
  logout(): Promise<void> {
    return api.post<void>('/auth/logout');
  },
  me(): Promise<AuthenticatedUser> {
    return api.get<Envelope<AuthenticatedUser>>('/auth/me').then((response) => response.data);
  },
  requestPasswordReset(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/forgot-password', { email });
  },
};
