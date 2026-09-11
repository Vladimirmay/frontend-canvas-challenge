import { useCallback, useEffect, useState } from 'react';
import { SpacePicker } from './components/SpacePicker';
import { CanvasPage } from './components/CanvasPage';
import { SpaceProvider } from './features/space/SpaceProvider';
import { getSpaceIdFromUrl, onSpaceRouteChange, setSpaceIdInUrl } from './lib/nav';

export function App() {
  const [spaceId, setSpaceId] = useState<string | null>(() => getSpaceIdFromUrl());

  useEffect(() => onSpaceRouteChange(() => setSpaceId(getSpaceIdFromUrl())), []);

  const open = useCallback((id: string) => {
    setSpaceIdInUrl(id);
    setSpaceId(id);
  }, []);

  const close = useCallback(() => {
    setSpaceIdInUrl(null);
    setSpaceId(null);
  }, []);

  if (!spaceId) return <SpacePicker onOpen={open} />;

  return (
    <SpaceProvider key={spaceId} spaceId={spaceId}>
      <div className="app">
        <button type="button" className="app__back" onClick={close}>
          ← Все пространства
        </button>
        <CanvasPage />
      </div>
    </SpaceProvider>
  );
}
