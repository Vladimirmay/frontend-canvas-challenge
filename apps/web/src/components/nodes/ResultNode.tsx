import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSpace } from '../../features/space/SpaceProvider';
import type { ResultCanvasNode } from '../../lib/graph/types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:4001';

export function ResultNode({ id, data }: NodeProps<ResultCanvasNode>) {
  const { resultsByNode } = useSpace();
  const generation = resultsByNode.get(id);
  const imageUrl = generation?.status === 'succeeded' && generation.imageUrl ? `${API_BASE_URL}${generation.imageUrl}` : null;

  return (
    <div className="canvas-node canvas-node--result">
      <Handle type="target" position={Position.Left} />
      <div className="canvas-node__label">{data.label}</div>
      {imageUrl ? (
        <img className="canvas-node__image" src={imageUrl} alt="Результат генерации" />
      ) : (
        <div className="canvas-node__placeholder">Пока нет результата</div>
      )}
    </div>
  );
}
