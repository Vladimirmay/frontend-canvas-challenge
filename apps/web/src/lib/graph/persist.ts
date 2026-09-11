import type { GraphData, NodeData } from '@canvas/contracts';
import type { Viewport } from '@xyflow/react';
import type { CanvasEdge, CanvasNode } from './types';

export function toPersistedGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  viewport: Viewport,
): GraphData {
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
      return {
        id: node.id,
        type: 'prompt',
        position: node.position,
        data: { text: node.data.text },
      };
    case 'generator':
      return {
        id: node.id,
        type: 'generator',
        position: node.position,
        data: { label: node.data.label },
      };
    case 'result':
      return {
        id: node.id,
        type: 'result',
        position: node.position,
        data: { label: node.data.label },
      };
  }
}

function fromPersistedNode(node: NodeData): CanvasNode {
  switch (node.type) {
    case 'prompt':
      return {
        id: node.id,
        type: 'prompt',
        position: node.position,
        data: { text: node.data.text },
      };
    case 'generator':
      return {
        id: node.id,
        type: 'generator',
        position: node.position,
        data: { label: node.data.label },
      };
    case 'result':
      return {
        id: node.id,
        type: 'result',
        position: node.position,
        data: { label: node.data.label },
      };
  }
}
