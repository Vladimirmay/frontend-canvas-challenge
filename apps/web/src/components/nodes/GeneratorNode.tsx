import { useId, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useSpace } from '../../features/space/SpaceProvider';
import { StatusBadge } from '../StatusBadge';
import { ErrorBanner } from '../ErrorBanner';
import { attemptStatusPresentation } from '../../lib/status';
import type { GeneratorCanvasNode } from '../../lib/graph/types';
import type { Scenario } from '../../features/generation/useGenerations';

export function GeneratorNode({ id, data }: NodeProps<GeneratorCanvasNode>) {
  const { attempts, generate, retryAfterNetworkError } = useSpace();
  const [scenario, setScenario] = useState<Scenario>('success');
  const groupName = useId();

  const attempt = attempts.get(id);
  const status = attempt?.status ?? 'idle';
  const busy = status === 'submitting' || status === 'processing';
  const presentation = attemptStatusPresentation(status);

  let banner: { message: string; actionLabel?: string; onAction?: () => void } | null = null;
  if (status === 'error' && attempt?.error) {
    banner = attempt.retryableKey
      ? {
          message: attempt.error.message,
          actionLabel: 'Повторить отправку',
          onAction: () => retryAfterNetworkError(id),
        }
      : { message: attempt.error.message };
  } else if (status === 'failed') {
    banner = {
      message: 'Генерация завершилась тестовым отказом.',
      actionLabel: 'Повторить',
      onAction: () => generate(id, scenario),
    };
  }

  return (
    <div className="canvas-node canvas-node--generator">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="canvas-node__label">{data.label}</div>
      <fieldset className="canvas-node__scenario" disabled={busy}>
        <legend>Сценарий проверки</legend>
        <label>
          <input
            type="radio"
            name={groupName}
            checked={scenario === 'success'}
            onChange={() => setScenario('success')}
          />
          Успех
        </label>
        <label>
          <input
            type="radio"
            name={groupName}
            checked={scenario === 'failure'}
            onChange={() => setScenario('failure')}
          />
          Отказ
        </label>
      </fieldset>
      <button
        type="button"
        className="canvas-node__button"
        disabled={busy}
        onClick={() => generate(id, scenario)}
      >
        Сгенерировать
      </button>
      <StatusBadge label={presentation.label} tone={presentation.tone} />
      {banner ? <ErrorBanner {...banner} /> : null}
    </div>
  );
}
