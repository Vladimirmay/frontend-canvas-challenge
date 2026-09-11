import { useId } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSpace } from '../../features/space/SpaceProvider';
import type { PromptCanvasNode } from '../../lib/graph/types';

export function PromptNode({ id, data }: NodeProps<PromptCanvasNode>) {
  const { graphController } = useSpace();
  const inputId = useId();

  return (
    <div className="canvas-node canvas-node--prompt">
      <Handle type="source" position={Position.Right} />
      <label htmlFor={inputId} className="canvas-node__label">
        Описание изображения
      </label>
      <textarea
        id={inputId}
        className="canvas-node__textarea nodrag nowheel"
        value={data.text}
        maxLength={2000}
        placeholder="Опишите, что нужно сгенерировать…"
        onChange={(event) => graphController.updateNodeData(id, { text: event.target.value })}
      />
    </div>
  );
}
