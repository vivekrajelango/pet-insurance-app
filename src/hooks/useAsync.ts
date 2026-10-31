import { useCallback, useEffect, useMemo, useState } from 'react';

interface Settled<T> {
  /** The request this result belongs to */
  request: object;
  data: T | null;
  error: Error | null;
}

/**
 * Runs `load` whenever `key` changes (build it from the inputs, e.g. `${petId}|${dob}`);
 * aborts the previous call. `reload()` runs it again (e.g. the Retry button).
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [attempt, setAttempt] = useState(0);
  // A new token for every key change or retry; a result only counts for its own token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const request = useMemo(() => ({}), [key, attempt]);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => !controller.signal.aborted && setSettled({ request, data, error: null }),
      (error: Error) =>
        !controller.signal.aborted &&
        error.name !== 'AbortError' &&
        setSettled({ request, data: null, error }),
    );
    return () => controller.abort();
    // `load` is a new function every render; `request` changes exactly when it should rerun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const current = settled?.request === request ? settled : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !current, reload };
}
