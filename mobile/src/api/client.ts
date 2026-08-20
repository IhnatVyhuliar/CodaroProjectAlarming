import axios, { type AxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { toApiError } from './errors';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Wired up by the session layer so the HTTP client never imports the store. */
export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenProvider();

  if (token !== null) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);

    if (apiError.status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(apiError);
  },
);

function url(path: string): string {
  return `${env.apiPrefix}${path}`;
}

/** Thin typed wrapper around the versioned API prefix. */
export const api = {
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get<T>(url(path), config).then((response) => response.data);
  },
  post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post<T>(url(path), body, config).then((response) => response.data);
  },
  patch<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch<T>(url(path), body, config).then((response) => response.data);
  },
  delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete<T>(url(path), config).then((response) => response.data);
  },
};
