export interface Debouncer {
  trigger: () => void;
  flush: () => void;
  cancel: () => void;
}

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
