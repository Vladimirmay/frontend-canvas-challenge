import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { GraphSyncController } from './GraphSyncController';

export function useGraphSync(spaceId: string, debounceMs: number) {
  const controller = useMemo(() => new GraphSyncController(spaceId, debounceMs), [spaceId, debounceMs]);

  useEffect(() => () => controller.destroy(), [controller]);

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  return { snapshot, controller };
}
