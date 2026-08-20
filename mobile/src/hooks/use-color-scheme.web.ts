import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = (): (() => void) => () => undefined;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * `useSyncExternalStore` gives us the server/client split without a state-setting effect.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
