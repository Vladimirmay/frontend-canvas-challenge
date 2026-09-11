/** A cancelled request (StrictMode's double-effect, an unmount, a superseded fetch) — never a user-facing error. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
