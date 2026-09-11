import type { GenerationData } from '@canvas/contracts';

export function pickCurrentGenerations(
  generationsNewestFirst: GenerationData[],
  nodeIds: Set<string>,
): Map<string, GenerationData> {
  const seenSource = new Set<string>();
  const seenResult = new Set<string>();
  const current = new Map<string, GenerationData>();
  for (const generation of generationsNewestFirst) {
    if (seenSource.has(generation.nodeId) || seenResult.has(generation.resultNodeId)) continue;
    seenSource.add(generation.nodeId);
    seenResult.add(generation.resultNodeId);
    if (nodeIds.has(generation.nodeId) && nodeIds.has(generation.resultNodeId)) {
      current.set(generation.nodeId, generation);
    }
  }
  return current;
}
