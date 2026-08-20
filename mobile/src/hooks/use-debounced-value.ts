import { useEffect, useState } from 'react';

/**
 * Debounces a value before it reaches a query key, so typing in a search box
 * does not fire a request per keystroke on a weak connection.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
