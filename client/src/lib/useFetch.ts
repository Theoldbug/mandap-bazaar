import { useCallback, useEffect, useRef, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Minimal data-loading hook: runs the fetcher on mount and whenever deps
 * change; ignores results from stale requests.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) {
        setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Something went wrong' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
