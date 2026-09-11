import type { CanvasNode } from './types';

const LABELS = { generator: 'Генератор', result: 'Результат' } as const;

export function createNode(type: CanvasNode['type'], position: { x: number; y: number }): CanvasNode {
  const id = crypto.randomUUID();
  if (type === 'prompt') return { id, type, position, data: { text: '' } };
  return { id, type, position, data: { label: LABELS[type] } };
}
