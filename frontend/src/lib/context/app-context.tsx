'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from '@/lib/hooks/use-session';
import { useWorkspaceData } from '@/lib/hooks/use-workspace-data';

type SessionReturn = ReturnType<typeof useSession>;
type WorkspaceReturn = ReturnType<typeof useWorkspaceData>;

interface AppContextValue extends SessionReturn, WorkspaceReturn {}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const workspace = useWorkspaceData(session.sessionId, session.authToken);

  return (
    <AppContext.Provider value={{ ...session, ...workspace }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
