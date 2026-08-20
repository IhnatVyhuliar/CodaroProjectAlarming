import { useCallback } from 'react';

import { useNetworkStore } from './network-store';
import { useOperationQueue } from './operation-queue';

export type SubmitOutcome = 'sent' | 'queued';

/**
 * Runs a write action immediately when online, otherwise parks it in the
 * operation queue so it replays on reconnect. Components stay unaware of the
 * queue mechanics — they only react to the returned outcome.
 */
export function useOfflineSubmit() {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const enqueue = useOperationQueue((state) => state.enqueue);

  const submit = useCallback(
    async (label: string, action: () => Promise<unknown>): Promise<SubmitOutcome> => {
      if (!isOnline) {
        enqueue(label, action);

        return 'queued';
      }

      await action();

      return 'sent';
    },
    [enqueue, isOnline],
  );

  return { submit, isOnline };
}
