import type { SpaceData } from '@canvas/contracts';
import { apiRequest } from './client';

export async function listSpaces(signal?: AbortSignal): Promise<SpaceData[]> {
  const { data } = await apiRequest<SpaceData[]>('/api/spaces', { signal });
  return data;
}

export async function createSpace(title: string, signal?: AbortSignal): Promise<SpaceData> {
  const { data } = await apiRequest<SpaceData>('/api/spaces', {
    method: 'POST',
    body: { title },
    signal,
  });
  return data;
}

export async function getSpace(spaceId: string, signal?: AbortSignal): Promise<SpaceData> {
  const { data } = await apiRequest<SpaceData>(`/api/spaces/${spaceId}`, { signal });
  return data;
}
