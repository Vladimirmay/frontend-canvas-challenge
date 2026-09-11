import { useEffect, useState, type FormEvent } from 'react';
import type { SpaceData } from '@canvas/contracts';
import { createSpace, listSpaces } from '../lib/api/spaces';
import { toApiError, type ApiError } from '../lib/api/errors';
import { isAbortError } from '../lib/async/abort';
import { ErrorBanner } from './ErrorBanner';

export function SpacePicker({ onOpen }: { onOpen: (spaceId: string) => void }) {
  const [spaces, setSpaces] = useState<SpaceData[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listSpaces(controller.signal)
      .then(setSpaces)
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setError(toApiError(err, 'Не удалось загрузить список пространств.'));
      });
    return () => controller.abort();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const space = await createSpace(trimmed);
      onOpen(space.id);
    } catch (err) {
      setError(toApiError(err, 'Не удалось создать пространство.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-picker">
      <h1>Рабочие пространства</h1>
      <form className="space-picker__form" onSubmit={(event) => void handleCreate(event)}>
        <label htmlFor="space-title">Название нового пространства</label>
        <input
          id="space-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
          placeholder="Мой канвас"
          required
        />
        <button type="submit" disabled={creating || !title.trim()}>
          {creating ? 'Создание…' : 'Создать'}
        </button>
      </form>
      {error ? <ErrorBanner message={error.message} /> : null}
      {spaces === null ? (
        <p>Загрузка…</p>
      ) : spaces.length === 0 ? (
        <p>Пространств пока нет — создайте первое.</p>
      ) : (
        <ul className="space-picker__list">
          {spaces.map((space) => (
            <li key={space.id}>
              <button type="button" onClick={() => onOpen(space.id)}>
                {space.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
