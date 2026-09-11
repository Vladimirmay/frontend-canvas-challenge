import type { GraphData } from '@canvas/contracts';
import { apiRequest } from './client';
import { ApiError } from './errors';

export interface GraphSnapshot {
  graph: GraphData;
  /** Byte-exact, quoted ETag as returned by the server — never computed client-side. */
  etag: string;
  /** Exact response body text, for byte-level comparison during lost-response recovery. */
  raw: string;
}

export async function getGraph(spaceId: string, signal?: AbortSignal): Promise<GraphSnapshot> {
  const { data, etag, raw } = await apiRequest<GraphData>(`/api/spaces/${spaceId}/graph`, { signal });
  if (!etag) throw new ApiError('MISSING_ETAG', 'Сервер не вернул ETag графа.');
  return { graph: data, etag, raw };
}

/**
 * `rawBody` must be the exact JSON text to send (built once by the caller via
 * `toPersistedGraph` + `JSON.stringify`) so the caller can later byte-compare it against what
 * the server reports, per the lost-response recovery rule in docs/INTEGRATION.md.
 */
export async function putGraph(
  spaceId: string,
  rawBody: string,
  ifMatch: string,
  signal?: AbortSignal,
): Promise<GraphSnapshot> {
  const { data, etag, raw } = await apiRequest<GraphData>(`/api/spaces/${spaceId}/graph`, {
    method: 'PUT',
    rawBody,
    headers: { 'If-Match': ifMatch },
    signal,
  });
  if (!etag) throw new ApiError('MISSING_ETAG', 'Сервер не вернул ETag графа.');
  return { graph: data, etag, raw };
}
