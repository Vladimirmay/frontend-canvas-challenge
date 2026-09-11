import type { SaveStatus } from '../features/graph/GraphSyncController';
import type { AttemptState } from '../features/generation/useGenerations';

export type StatusTone = 'neutral' | 'progress' | 'success' | 'error';
export interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

export function saveStatusPresentation(status: SaveStatus): StatusPresentation {
  switch (status) {
    case 'loading':
      return { label: 'Загрузка…', tone: 'neutral' };
    case 'unsaved':
      return { label: 'Есть несохранённые правки', tone: 'neutral' };
    case 'saving':
      return { label: 'Сохранение…', tone: 'progress' };
    case 'saved':
      return { label: 'Сохранено', tone: 'success' };
    case 'error':
      return { label: 'Ошибка сохранения', tone: 'error' };
  }
}

export function attemptStatusPresentation(status: AttemptState['status']): StatusPresentation {
  switch (status) {
    case 'idle':
      return { label: 'Не запущено', tone: 'neutral' };
    case 'submitting':
      return { label: 'Отправка…', tone: 'progress' };
    case 'processing':
      return { label: 'Генерация…', tone: 'progress' };
    case 'succeeded':
      return { label: 'Готово', tone: 'success' };
    case 'failed':
      return { label: 'Отказ генерации', tone: 'error' };
    case 'error':
      return { label: 'Ошибка запроса', tone: 'error' };
  }
}
