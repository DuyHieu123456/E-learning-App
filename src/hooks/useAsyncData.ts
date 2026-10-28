// useAsyncData — shared hook for screens that load catalog data via
// src/services/api.ts (async since the mockapi switch).
//
// Usage:
//   const { data, loading, error, retry } = useAsyncData(() => fetchCourses());
//   if (loading) return <LoadingView />;
//   if (error || !data) return <ErrorView message={error} onRetry={retry} />;
import { useCallback, useEffect, useRef, useState } from 'react';

import { refreshCatalog } from '../services/api';

export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: readonly unknown[] = []): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const retry = useCallback(() => {
    refreshCatalog();
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The loader identity changes every render by design; re-run only when
    // the caller-provided deps (or the retry attempt) change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { data, loading, error, retry };
}
