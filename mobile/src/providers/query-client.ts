import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Retry only what a weak network can plausibly recover from.
          if (error instanceof ApiError && error.isNetworkError) {
            return failureCount < 3;
          }

          return false;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
