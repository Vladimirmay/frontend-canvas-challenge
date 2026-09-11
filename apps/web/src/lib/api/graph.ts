import type { GraphData } from '@canvas/contracts';
import { apiRequest } from './client';
import { ApiError } from './errors';

export interface GraphSnapshot {
  graph: GraphData;
  etag: string;
  raw: string;
}

export async function getGraph(spaceId: string, signal?: AbortSignal): Promise<GraphSnapshot> {
  const { data, etag, raw } = await apiRequest<GraphData>(`/api/spaces/${spaceId}/graph`, {
    signal,
  });
  if (!etag) throw new ApiError('MISSING_ETAG', 'Сервер не вернул ETag графа.');
  return { graph: data, etag, raw };
}

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
