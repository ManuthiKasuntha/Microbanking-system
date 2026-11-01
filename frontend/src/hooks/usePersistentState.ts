import { useEffect, useState } from 'react';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// useState that survives reloads; isValid rejects stale values (e.g. a tab that no longer exists)
export const usePersistentState = <T extends string>(key: string, fallback: T, isValid?: (value: string) => boolean) => {
  const [value, setValue] = useState<T>(() => {
    const saved = read(key);
    return saved !== null && (!isValid || isValid(saved)) ? (saved as T) : fallback;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (private mode); the state still works for this visit
    }
  }, [key, value]);

  return [value, setValue] as const;
};

export const usePersistentFlag = (key: string, fallback = false) => {
  const [value, setValue] = usePersistentState<'true' | 'false'>(key, fallback ? 'true' : 'false');
  return [value === 'true', (next: boolean) => setValue(next ? 'true' : 'false')] as const;
};
