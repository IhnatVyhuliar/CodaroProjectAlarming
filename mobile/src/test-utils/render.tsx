import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { installMockApi } from '@/api/mock/install';
import { resetMockData } from '@/api/mock/dataset';
import { useSessionStore } from '@/auth/session-store';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Fresh demo dataset + clean stores before each test. */
export function resetTestEnvironment(): void {
  installMockApi();
  resetMockData();
  useSessionStore.setState({ status: 'anonymous', token: null, user: null });
  useNetworkStore.setState({ isOnline: true, isUnknown: false });
  useOperationQueue.setState({ pending: [], isFlushing: false, lastError: null });
}

export const DEMO_PASSWORD = 'haslo123';

export const demoAccounts = {
  client: 'klient@codaro.test',
  clientSecondary: 'klient2@codaro.test',
  admin: 'admin@codaro.test',
  staffTechnik: 'technik@codaro.test',
  staffKonserwator: 'konserwator@codaro.test',
  staffElektryk: 'elektryk@codaro.test',
} as const;

export async function signInAs(email: string): Promise<void> {
  await useSessionStore.getState().signIn(email, DEMO_PASSWORD);
}

export type RenderWithProvidersResult = RenderResult & { queryClient: QueryClient };

export async function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {},
): Promise<RenderWithProvidersResult> {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const result = await render(ui, {
    ...renderOptions,
    wrapper: ({ children }: { children?: React.ReactNode }) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    ),
  });

  return { ...result, queryClient };
}
