import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { handleMockRequest, MockHttpError, type MockRequestContext } from './handlers';

const SUPPORTED_METHODS: MockRequestContext['method'][] = ['get', 'post', 'patch', 'put', 'delete'];

function resolveMethod(config: InternalAxiosRequestConfig): MockRequestContext['method'] {
  const method = (config.method ?? 'get').toLowerCase();

  return SUPPORTED_METHODS.includes(method as MockRequestContext['method'])
    ? (method as MockRequestContext['method'])
    : 'get';
}

function resolvePathAndQuery(config: InternalAxiosRequestConfig): {
  path: string;
  query: URLSearchParams;
} {
  const raw = config.url ?? '';
  const withoutOrigin = raw.replace(env.apiUrl, '');
  const [pathPart, queryPart] = withoutOrigin.split('?');
  const path = pathPart.startsWith(env.apiPrefix)
    ? pathPart.slice(env.apiPrefix.length)
    : pathPart;

  const query = new URLSearchParams(queryPart ?? '');

  Object.entries(config.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });

  return { path: path.length === 0 ? '/' : path, query };
}

function formDataToObject(data: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  try {
    // React Native's FormData exposes `getParts()`, the web one exposes `entries()`.
    const parts = (data as unknown as { getParts?: () => { fieldName: string; string?: string; name?: string }[] })
      .getParts;

    if (typeof parts === 'function') {
      parts.call(data).forEach((part) => {
        result[part.fieldName] = part.string ?? part.name ?? '';
      });

      return result;
    }

    if (typeof data.forEach === 'function') {
      data.forEach((value, key) => {
        result[key] = typeof value === 'string' ? value : ((value as File).name ?? '');
      });
    }
  } catch {
    return result;
  }

  return result;
}

function resolveBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const data: unknown = config.data;

  if (data === undefined || data === null) {
    return {};
  }

  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);

      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return formDataToObject(data);
  }

  if (typeof data === 'object') {
    return data as Record<string, unknown>;
  }

  return {};
}

function resolveToken(config: InternalAxiosRequestConfig): string | null {
  const header = config.headers.get('Authorization');

  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Axios adapter answering requests from the in-memory demo dataset.
 * Used only when `env.apiMode === 'mock'` (development builds and tests).
 */
export function createMockAdapter(latencyMs = 0): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    if (latencyMs > 0) {
      await delay(latencyMs);
    }

    const { path, query } = resolvePathAndQuery(config);
    const context: MockRequestContext = {
      method: resolveMethod(config),
      path,
      query,
      body: resolveBody(config),
      token: resolveToken(config),
    };

    try {
      const result = handleMockRequest(context);

      return {
        data: result.data,
        status: result.status,
        statusText: 'OK',
        headers: {},
        config,
      };
    } catch (error) {
      const mockError =
        error instanceof MockHttpError
          ? error
          : new MockHttpError(500, error instanceof Error ? error.message : 'Błąd mock API');

      const response: AxiosResponse = {
        data: { message: mockError.message, errors: mockError.errors },
        status: mockError.status,
        statusText: 'Error',
        headers: {},
        config,
      };

      throw new AxiosError(
        mockError.message,
        String(mockError.status),
        config,
        null,
        response,
      );
    }
  };
}
