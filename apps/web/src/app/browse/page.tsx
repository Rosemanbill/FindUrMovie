'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { Hero } from '@/components/hero';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { TitleRow } from '@/components/title-row';
import { api } from '@/lib/api';

export default function BrowsePage() {
  const { token, activeProfile } = useSession();
  const home = useQuery({
    queryKey: ['home', activeProfile?.id],
    queryFn: () => api.homeRows(token!, activeProfile!.id),
    enabled: Boolean(token && activeProfile)
  });

  return (
    <RequireAuth>
      <AppShell>
        {home.isLoading && <div className="grid min-h-[70vh] place-items-center">Loading rows...</div>}
        {home.error && (
          <div className="mx-auto max-w-7xl px-5 py-12 text-ember">
            {home.error instanceof Error ? home.error.message : 'Unable to load rows.'}
          </div>
        )}
        {home.data?.featured && <Hero title={home.data.featured} />}
        <div className="pb-12">
          {home.data?.rows.map((row) => (
            <TitleRow key={row.key} label={row.label} titles={row.titles} />
          ))}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
