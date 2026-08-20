import type { RealtimeEvent } from './events';

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();

/**
 * Local event bus used when no WebSocket server is configured (mock mode) and
 * by tests, so the realtime cache-invalidation path stays exercisable.
 */
export const devRealtimeBus = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: RealtimeEvent): void {
    listeners.forEach((listener) => listener(event));
  },
  listenerCount(): number {
    return listeners.size;
  },
};
