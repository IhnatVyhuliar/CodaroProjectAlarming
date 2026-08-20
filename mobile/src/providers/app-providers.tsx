import NetInfo from '@react-native-community/netinfo';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useSessionStore } from '@/auth/session-store';
import { useNetworkStore } from '@/offline/network-store';
import { useOperationQueue } from '@/offline/operation-queue';
import { RealtimeBridge } from '@/realtime/realtime-provider';
import { createQueryClient } from './query-client';

function NetworkWatcher(): null {
  const setOnline = useNetworkStore((state) => state.setOnline);
  const wasOnline = useRef(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      setOnline(isOnline);

      if (isOnline && !wasOnline.current) {
        void useOperationQueue.getState().flush();
      }

      wasOnline.current = isOnline;
    });
  }, [setOnline]);

  return null;
}

function SessionBootstrap(): null {
  const restore = useSessionStore((state) => state.restore);

  useEffect(() => {
    void restore();
  }, [restore]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap />
      <NetworkWatcher />
      <RealtimeBridge>{children}</RealtimeBridge>
    </QueryClientProvider>
  );
}
