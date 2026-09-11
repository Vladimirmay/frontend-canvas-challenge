export interface PollOptions<T> {
  intervalMs: number;
  isSettled: (value: T) => boolean;
  signal?: AbortSignal;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Generic "fetch, check, wait, repeat" loop reused for every polling need in the app (currently
 * generation status). `fetchOnce` should go through the shared `apiRequest` chokepoint so
 * cancellation and error normalization stay consistent with every other call.
 */
export async function pollUntilSettled<T>(
  fetchOnce: (signal: AbortSignal | undefined) => Promise<T>,
  { intervalMs, isSettled, signal }: PollOptions<T>,
): Promise<T> {
  for (;;) {
    const value = await fetchOnce(signal);
    if (isSettled(value)) return value;
    await delay(intervalMs, signal);
  }
}
