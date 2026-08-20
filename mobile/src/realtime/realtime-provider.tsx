import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSessionStore } from '@/auth/session-store';
import { applyRealtimeEvent } from './apply-event';
import { devRealtimeBus } from './dev-bus';
import { connectRealtime, realtimeAvailable } from './echo';
import type { RealtimeEvent } from './events';

/**
 * Bridges realtime events into the query cache. When no WebSocket server is
 * configured it still listens on the local dev bus, so the same code path runs.
 */
export function RealtimeBridge({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    const handle = (event: RealtimeEvent): void => {
      applyRealtimeEvent(queryClient, event);
    };

    const unsubscribeDevBus = devRealtimeBus.subscribe(handle);

    if (token === null || user === null || !realtimeAvailable()) {
      return unsubscribeDevBus;
    }

    const subscription = connectRealtime(token, { id: user.id, role: user.role }, handle);

    return () => {
      unsubscribeDevBus();
      subscription?.disconnect();
    };
  }, [queryClient, token, user]);

  return children;
}
