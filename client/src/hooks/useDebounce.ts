import { useState, useEffect } from "react";

/**
 * Delays updating the returned value until `delay` ms have passed
 * since the last change to `value`.
 *
 * Used for search input — prevents an API call on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
