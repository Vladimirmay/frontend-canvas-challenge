import type { CanvasEdge, CanvasNode } from './types';

export interface DegreeIndex {
  edgesByTarget: Map<string, string>;
  generatorOutEdge: Map<string, string>;
}

export function buildNodeIndex(nodes: CanvasNode[]): Map<string, CanvasNode> {
  const index = new Map<string, CanvasNode>();
  for (const node of nodes) index.set(node.id, node);
  return index;
}

export function buildDegreeIndex(
  edges: CanvasEdge[],
  nodesById: Map<string, CanvasNode>,
): DegreeIndex {
  const edgesByTarget = new Map<string, string>();
  const generatorOutEdge = new Map<string, string>();
  for (const edge of edges) {
    edgesByTarget.set(edge.target, edge.id);
    if (nodesById.get(edge.source)?.type === 'generator')
      generatorOutEdge.set(edge.source, edge.id);
  }
  return { edgesByTarget, generatorOutEdge };
}

interface ConnectionLike {
  source: string | null;
  target: string | null;
}

export function isValidConnection(
  connection: ConnectionLike,
  nodesById: Map<string, CanvasNode>,
  degreeIndex: DegreeIndex,
): boolean {
  if (!connection.source || !connection.target || connection.source === connection.target)
    return false;
  const source = nodesById.get(connection.source);
  const target = nodesById.get(connection.target);
  if (!source || !target) return false;
  const typeOk =
    (source.type === 'prompt' && target.type === 'generator') ||
    (source.type === 'generator' && target.type === 'result');
  if (!typeOk) return false;
  if (degreeIndex.edgesByTarget.has(connection.target)) return false;
  if (source.type === 'generator' && degreeIndex.generatorOutEdge.has(source.id)) return false;
  return true;
}

export function canAddNode(nodeCount: number, maxNodes: number): boolean {
  return nodeCount < maxNodes;
}

export function canAddEdge(edgeCount: number, maxEdges: number): boolean {
  return edgeCount < maxEdges;
}

export function removeNodesCascade(
  deletedIds: Set<string>,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  return {
    nodes: nodes.filter((node) => !deletedIds.has(node.id)),
    edges: edges.filter((edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target)),
  };
}
