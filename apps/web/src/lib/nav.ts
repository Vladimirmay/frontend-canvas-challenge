const SPACE_PARAM = 'space';

export function getSpaceIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(SPACE_PARAM);
}

export function setSpaceIdInUrl(spaceId: string | null): void {
  const url = new URL(window.location.href);
  if (spaceId) url.searchParams.set(SPACE_PARAM, spaceId);
  else url.searchParams.delete(SPACE_PARAM);
  window.history.pushState({}, '', url);
}

export function onSpaceRouteChange(listener: () => void): () => void {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
