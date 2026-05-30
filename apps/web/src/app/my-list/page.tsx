'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { TitleCard } from '@/components/title-card';
import { api } from '@/lib/api';

export default function MyListPage() {
  const { token, activeProfile } = useSession();
  const watchlist = useQuery({
    queryKey: ['watchlist', activeProfile?.id],
    queryFn: () => api.watchlist(token!, activeProfile!.id),
    enabled: Boolean(token && activeProfile)
  });

  return (
    <RequireAuth>
      <AppShell>
        <main className="mx-auto min-h-screen max-w-7xl px-5 py-10">
          <h1 className="mb-8 text-4xl font-black text-white">My List</h1>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {watchlist.data?.map((title) => (
              <TitleCard key={title.id} title={title} />
            ))}
          </div>
          {watchlist.data?.length === 0 && <p className="text-smoke/70">Your saved titles will appear here.</p>}
        </main>
      </AppShell>
    </RequireAuth>
  );
}
