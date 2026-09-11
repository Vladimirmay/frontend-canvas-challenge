import { useSpace } from '../features/space/SpaceProvider';
import { StatusBadge } from './StatusBadge';
import { ErrorBanner } from './ErrorBanner';
import { saveStatusPresentation } from '../lib/status';
import { createNode } from '../lib/graph/factory';
import { canAddNode } from '../lib/graph/rules';
import type { CanvasNode } from '../lib/graph/types';

const NODE_TYPE_LABELS: Record<string, string> = {
  prompt: 'Текст',
  generator: 'Генератор',
  result: 'Результат',
};

export function Toolbar() {
  const { config, graph, graphController } = useSpace();
  const presentation = saveStatusPresentation(graph.saveStatus);
  const atCapacity = !canAddNode(graph.nodes.length, config.maxNodes);

  const addNode = (type: string) => {
    if (atCapacity) return;
    const offset = (graph.nodes.length * 48) % 400;
    graphController.addNode(createNode(type as CanvasNode['type'], { x: 80 + offset, y: 80 + offset }));
  };

  return (
    <div className="toolbar">
      <div className="toolbar__actions">
        {config.nodeTypes.map((type) => (
          <button key={type} type="button" onClick={() => addNode(type)} disabled={atCapacity}>
            + {NODE_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>
      <div className="toolbar__status">
        <StatusBadge label={presentation.label} tone={presentation.tone} />
        <span className="toolbar__count">
          {graph.nodes.length}/{config.maxNodes} нод · {graph.edges.length}/{config.maxEdges} связей
        </span>
      </div>
      {graph.conflict ? (
        <ErrorBanner
          message="Граф изменился на сервере. Локальные правки сохранены — перечитайте актуальную версию."
          actionLabel="Перечитать граф с сервера"
          onAction={() => graphController.resolveConflict()}
        />
      ) : graph.saveStatus === 'error' && graph.error ? (
        <ErrorBanner message={graph.error.message} />
      ) : null}
    </div>
  );
}
