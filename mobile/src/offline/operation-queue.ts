import { create } from 'zustand';

import { toApiError } from '@/api/errors';

export interface PendingOperation {
  id: string;
  label: string;
  createdAt: string;
  run: () => Promise<unknown>;
}

interface OperationQueueState {
  pending: PendingOperation[];
  isFlushing: boolean;
  lastError: string | null;
  enqueue: (label: string, run: () => Promise<unknown>) => string;
  remove: (id: string) => void;
  flush: () => Promise<void>;
  clearError: () => void;
}

let counter = 0;

/**
 * Actions performed while offline are parked here and replayed once the network
 * returns, so a status change or an assignment is never silently lost.
 */
export const useOperationQueue = create<OperationQueueState>((set, get) => ({
  pending: [],
  isFlushing: false,
  lastError: null,

  enqueue(label, run) {
    counter += 1;

    const id = `op-${counter}`;

    set((state) => ({
      pending: [
        ...state.pending,
        { id, label, createdAt: new Date().toISOString(), run },
      ],
    }));

    return id;
  },

  remove(id) {
    set((state) => ({ pending: state.pending.filter((operation) => operation.id !== id) }));
  },

  async flush() {
    if (get().isFlushing) {
      return;
    }

    set({ isFlushing: true, lastError: null });

    try {
      for (const operation of [...get().pending]) {
        try {
          await operation.run();
          get().remove(operation.id);
        } catch (error) {
          const apiError = toApiError(error);

          if (apiError.isNetworkError) {
            // Still offline — keep the operation for the next attempt.
            break;
          }

          // A rejected operation is dropped, but the reason stays visible.
          get().remove(operation.id);
          set({ lastError: `${operation.label}: ${apiError.message}` });
        }
      }
    } finally {
      set({ isFlushing: false });
    }
  },

  clearError() {
    set({ lastError: null });
  },
}));
