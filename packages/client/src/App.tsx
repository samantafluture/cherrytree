/**
 * Root application component.
 *
 * @consumers main.tsx
 * @depends components/, context/
 */

import { useCallback, useState } from 'react';

import { AuthGate, OutlineList, OutlineView } from './components';
import { AuthProvider, OutlineProvider } from './context';

type ActiveOutline = { id: string; title: string };

function AppContent() {
  const [active, setActive] = useState<ActiveOutline | null>(null);

  const handleSelect = useCallback((id: string, title: string) => {
    setActive({ id, title });
  }, []);

  const handleBack = useCallback(() => {
    setActive(null);
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setActive((prev) => (prev ? { ...prev, title } : null));
  }, []);

  if (!active) {
    return <OutlineList onSelect={handleSelect} />;
  }

  return (
    <OutlineProvider>
      <OutlineView
        outlineId={active.id}
        outlineTitle={active.title}
        onBack={handleBack}
        onTitleChange={handleTitleChange}
      />
    </OutlineProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  );
}
