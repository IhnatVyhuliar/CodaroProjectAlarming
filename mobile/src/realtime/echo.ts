import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

import { env, isRealtimeConfigured } from '@/config/env';
import type { UserRole } from '@/api/types';
import { isRealtimeEventName, toRealtimeEvent, type RealtimeEvent } from './events';

// laravel-echo picks the Pusher implementation up from the global scope.
(globalThis as { Pusher?: unknown }).Pusher = Pusher;

type EchoInstance = Echo<'reverb'>;

let instance: EchoInstance | null = null;

export interface RealtimeSubscription {
  disconnect: () => void;
  subscribeToReport: (reportId: number) => () => void;
}

export function realtimeAvailable(): boolean {
  return isRealtimeConfigured && env.apiMode === 'live';
}

/**
 * Opens the Reverb connection and wires the user-scoped channels.
 * Returns `null` when realtime is not configured — the app then relies on
 * pull-to-refresh and query refetching instead.
 */
export function connectRealtime(
  token: string,
  user: { id: number; role: UserRole },
  onEvent: (event: RealtimeEvent) => void,
): RealtimeSubscription | null {
  if (!realtimeAvailable()) {
    return null;
  }

  if (instance === null) {
    instance = new Echo<'reverb'>({
      broadcaster: 'reverb',
      key: env.reverb.appKey ?? undefined,
      wsHost: env.reverb.host ?? undefined,
      wsPort: env.reverb.port,
      wssPort: env.reverb.port,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${env.apiUrl}/broadcasting/auth`,
      auth: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const echo = instance;
  const listen = (channelName: string): void => {
    const channel = echo.private(channelName);

    channel.listenToAll((eventName: string, payload: unknown) => {
      const normalised = eventName.replace(/^\./, '');

      if (isRealtimeEventName(normalised)) {
        onEvent(toRealtimeEvent(normalised, payload));
      }
    });
  };

  listen(`user.${user.id}`);

  if (user.role === 'admin' || user.role === 'super_admin') {
    listen(`admin.${user.id}.queue`);
  }

  if (user.role === 'staff') {
    listen(`staff.${user.id}`);
  }

  return {
    disconnect: () => {
      echo.disconnect();
      instance = null;
    },
    subscribeToReport: (reportId: number) => {
      listen(`report.${reportId}`);

      return () => {
        echo.leave(`report.${reportId}`);
      };
    },
  };
}
