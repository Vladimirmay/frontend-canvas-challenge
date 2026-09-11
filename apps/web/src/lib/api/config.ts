import { apiRequest } from './client';

export interface AppConfig {
  debounceMs: number;
  pollIntervalMs: number;
  generationDelayMs: number;
  maxNodes: number;
  maxEdges: number;
  nodeTypes: string[];
}

let cached: Promise<AppConfig> | null = null;

/** Fetched once and reused everywhere, instead of hardcoding debounce/poll/limit constants per feature. */
export function getConfig(): Promise<AppConfig> {
  cached ??= apiRequest<AppConfig>('/api/config').then((r) => r.data);
  return cached;
}
