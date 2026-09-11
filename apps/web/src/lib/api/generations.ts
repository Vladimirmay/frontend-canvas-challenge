import type { GenerationData, GenerationRequest } from '@canvas/contracts';
import { apiRequest } from './client';

/** Already newest-first from the server — do not re-sort. */
export async function listGenerations(
  spaceId: string,
  signal?: AbortSignal,
): Promise<GenerationData[]> {
  const { data } = await apiRequest<GenerationData[]>(`/api/spaces/${spaceId}/generations`, {
    signal,
  });
  return data;
}

export async function createGeneration(
  spaceId: string,
  body: GenerationRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<GenerationData> {
  const { data } = await apiRequest<GenerationData>(`/api/spaces/${spaceId}/generations`, {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  });
  return data;
}

export async function getGeneration(
  spaceId: string,
  generationId: string,
  signal?: AbortSignal,
): Promise<GenerationData> {
  const { data } = await apiRequest<GenerationData>(
    `/api/spaces/${spaceId}/generations/${generationId}`,
    {
      signal,
    },
  );
  return data;
}
