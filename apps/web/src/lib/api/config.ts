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

export function getConfig(): Promise<AppConfig> {
  cached ??= apiRequest<AppConfig>('/api/config').then((r) => r.data);
  return cached;
}
