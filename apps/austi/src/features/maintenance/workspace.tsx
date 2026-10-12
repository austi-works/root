import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/ui/native-select';
import { useConvexAuth, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from '#convex/_generated/api';

const Workspace = createContext<string | undefined>(undefined);
export const useWorkspace = () => useContext(Workspace);
export const useClock = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
};
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const auth = useConvexAuth();
  const workspaces = useQuery(api.austi.workspaces.list, auth.isAuthenticated ? {} : 'skip');
  const [selected, setSelected] = useState('');
  const current = workspaces?.find((w) => w.id === selected)?.id ?? workspaces?.[0]?.id;
  if (!auth.isAuthenticated || !workspaces)
    return (
      <div className='p-6 text-sm text-muted-foreground'>
        {auth.isLoading || auth.isAuthenticated ? (
          <p role='status'>Loading your portfolio…</p>
        ) : (
          <p>
            Your session could not be verified.{' '}
            <a className='underline' href='/api/auth/sign-in'>
              Sign in again
            </a>
            .
          </p>
        )}
      </div>
    );
  return (
    <Workspace.Provider value={current}>
      {!!workspaces && workspaces.length > 1 && (
        <div className='border-b px-6 py-2'>
          <NativeSelect
            aria-label='Portfolio'
            value={current}
            onChange={(e) => setSelected(e.target.value)}
          >
            {workspaces.map((w) => (
              <NativeSelectOption key={w.id} value={w.id}>
                {w.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
      {children}
    </Workspace.Provider>
  );
}
