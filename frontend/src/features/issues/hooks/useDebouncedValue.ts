/**
 * 디바운스 hook — M02-20 검색 입력 디바운스 + Sprint 후반 다른 필터에도 재활용.
 *
 * 설계 근거: design.md §8.1 — 검색 디바운스로 백엔드 호출 부하 완화.
 */
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
