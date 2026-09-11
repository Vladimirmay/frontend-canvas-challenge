import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Connection,
  type Viewport,
} from '@xyflow/react';
import { useSpace } from '../features/space/SpaceProvider';
import { PromptNode } from './nodes/PromptNode';
import { GeneratorNode } from './nodes/GeneratorNode';
import { ResultNode } from './nodes/ResultNode';
import { ErrorBanner } from './ErrorBanner';
import { Toolbar } from './Toolbar';
import {
  buildDegreeIndex,
  buildNodeIndex,
  canAddEdge,
  isValidConnection,
} from '../lib/graph/rules';

const nodeTypes = { prompt: PromptNode, generator: GeneratorNode, result: ResultNode };

function CanvasSurface() {
  const { config, graph, graphController } = useSpace();

  const nodesById = useMemo(() => buildNodeIndex(graph.nodes), [graph.nodes]);
  const degreeIndex = useMemo(
    () => buildDegreeIndex(graph.edges, nodesById),
    [graph.edges, nodesById],
  );

  const handleIsValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null }) =>
      canAddEdge(graph.edges.length, config.maxEdges) &&
      isValidConnection(connection, nodesById, degreeIndex),
    [graph.edges.length, config.maxEdges, nodesById, degreeIndex],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      graphController.addEdge({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
      });
    },
    [graphController],
  );

  const handleNodesDelete = useCallback(
    (deleted: { id: string }[]) => {
      graphController.removeNodesCascade(new Set(deleted.map((node) => node.id)));
    },
    [graphController],
  );

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      graphController.setViewport(viewport);
    },
    [graphController],
  );

  if (!graph.ready) {
    return (
      <div className="canvas-surface canvas-surface--loading">
        <p>Загрузка пространства…</p>
        {graph.error ? <ErrorBanner message={graph.error.message} /> : null}
      </div>
    );
  }

  return (
    <div className="canvas-surface">
      <Toolbar />
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        defaultViewport={graph.viewport}
        onNodesChange={(changes) => graphController.onNodesChange(changes)}
        onEdgesChange={(changes) => graphController.onEdgesChange(changes)}
        onConnect={handleConnect}
        isValidConnection={handleIsValidConnection}
        onNodesDelete={handleNodesDelete}
        onMoveEnd={handleMoveEnd}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasSurface />
    </ReactFlowProvider>
  );
}
