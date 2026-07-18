import { useState, useEffect } from 'react';
import { debounce } from '@/utils';

/**
 * 防抖 Hook
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    handler();

    return () => {
      // Cleanup
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
