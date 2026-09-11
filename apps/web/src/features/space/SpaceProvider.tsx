import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GenerationData } from '@canvas/contracts';
import { getConfig, type AppConfig } from '../../lib/api/config';
import { useGraphSync } from '../graph/useGraphSync';
import type { GraphSnapshot, GraphSyncController } from '../graph/GraphSyncController';
import { useGenerations, type AttemptState, type Scenario } from '../generation/useGenerations';

interface SpaceContextValue {
  config: AppConfig;
  graph: GraphSnapshot;
  graphController: GraphSyncController;
  attempts: Map<string, AttemptState>;
  /** Generation keyed by the result node it belongs to — O(1) lookup for ResultNode. */
  resultsByNode: Map<string, GenerationData>;
  generate: (nodeId: string, scenario: Scenario) => void;
  retryAfterNetworkError: (nodeId: string) => void;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function useSpace(): SpaceContextValue {
  const value = useContext(SpaceContext);
  if (!value) throw new Error('useSpace must be used within SpaceProvider.');
  return value;
}

export function SpaceProvider({ spaceId, children }: { spaceId: string; children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getConfig().then((value) => {
      if (!cancelled) setConfig(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config) return <p className="space-provider__loading">Загрузка настроек…</p>;

  return (
    <SpaceProviderReady spaceId={spaceId} config={config}>
      {children}
    </SpaceProviderReady>
  );
}

function SpaceProviderReady({
  spaceId,
  config,
  children,
}: {
  spaceId: string;
  config: AppConfig;
  children: ReactNode;
}) {
  const { snapshot: graph, controller: graphController } = useGraphSync(spaceId, config.debounceMs);
  const { attempts, generate, retryAfterNetworkError } = useGenerations(spaceId, graphController, config.pollIntervalMs);

  const resultsByNode = useMemo(() => {
    const index = new Map<string, GenerationData>();
    for (const attempt of attempts.values()) {
      if (attempt.generation) index.set(attempt.generation.resultNodeId, attempt.generation);
    }
    return index;
  }, [attempts]);

  const value = useMemo<SpaceContextValue>(
    () => ({ config, graph, graphController, attempts, resultsByNode, generate, retryAfterNetworkError }),
    [config, graph, graphController, attempts, resultsByNode, generate, retryAfterNetworkError],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}
