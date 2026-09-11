export interface Debouncer {
  /** (Re)start the delay; calling again before it elapses postpones the call. */
  trigger: () => void;
  /** Run immediately if a call is pending, cancelling the timer; no-op otherwise. */
  flush: () => void;
  /** Cancel a pending call without running it. */
  cancel: () => void;
}

/** Generic trailing debouncer, reused wherever "settle, then act once" behavior is needed. */
export function createDebouncer(fn: () => void, delayMs: number): Debouncer {
  let handle: ReturnType<typeof setTimeout> | null = null;

  function clear() {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
  }

  return {
    trigger() {
      clear();
      handle = setTimeout(() => {
        handle = null;
        fn();
      }, delayMs);
    },
    flush() {
      const wasPending = handle !== null;
      clear();
      if (wasPending) fn();
    },
    cancel: clear,
  };
}
