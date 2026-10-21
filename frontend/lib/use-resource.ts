"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Minimal client data hook: runs `loader` on mount and whenever `deps` change, exposes `reload`. */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-side fetch on mount
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
