import type { GraphData, NodeData } from '@canvas/contracts';
import type { Viewport } from '@xyflow/react';
import type { CanvasEdge, CanvasNode } from './types';

/**
 * Maps React Flow's runtime nodes/edges (which carry `selected`, `dragging`, `measured`, event
 * handlers, etc.) to exactly the wire shape the server accepts. One pass per array, no
 * intermediate filtered/mapped arrays and no cross-referencing lookups — see apps/web/README.md
 * for the call-frequency/pass-count/allocation write-up this function is the subject of.
 */
export function toPersistedGraph(nodes: CanvasNode[], edges: CanvasEdge[], viewport: Viewport): GraphData {
  return {
    nodes: nodes.map(toPersistedNode),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    viewport,
  };
}

export function fromPersistedGraph(graph: GraphData): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
} {
  return {
    nodes: graph.nodes.map(fromPersistedNode),
    edges: graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    viewport: graph.viewport,
  };
}

function toPersistedNode(node: CanvasNode): NodeData {
  switch (node.type) {
    case 'prompt':
      return { id: node.id, type: 'prompt', position: node.position, data: { text: node.data.text } };
    case 'generator':
      return { id: node.id, type: 'generator', position: node.position, data: { label: node.data.label } };
    case 'result':
      return { id: node.id, type: 'result', position: node.position, data: { label: node.data.label } };
  }
}

function fromPersistedNode(node: NodeData): CanvasNode {
  switch (node.type) {
    case 'prompt':
      return { id: node.id, type: 'prompt', position: node.position, data: { text: node.data.text } };
    case 'generator':
      return { id: node.id, type: 'generator', position: node.position, data: { label: node.data.label } };
    case 'result':
      return { id: node.id, type: 'result', position: node.position, data: { label: node.data.label } };
  }
}
