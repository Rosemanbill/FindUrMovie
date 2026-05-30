'use client';

import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { TitleCard } from '@/components/title-card';
import { api } from '@/lib/api';

export default function SearchPage() {
  const { token, activeProfile } = useSession();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const results = useQuery({
    queryKey: ['search', activeProfile?.id, query],
    queryFn: () => api.search(token!, activeProfile!.id, query),
    enabled: Boolean(token && activeProfile && query)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setQuery(input.trim());
  }

  return (
    <RequireAuth>
      <AppShell>
        <main className="mx-auto min-h-screen max-w-7xl px-5 py-10">
          <p className="mb-3 text-sm font-black uppercase text-limeglass">HDToday search</p>
          <h1 className="mb-5 text-4xl font-black text-white">Search movies and TV series.</h1>
          <form onSubmit={submit} className="flex max-w-3xl gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
              placeholder="Try: game, squid game, mario"
            />
            <button className="rounded-md bg-ember px-5 py-3 font-black text-white">Search</button>
          </form>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.data?.map((title) => (
              <TitleCard key={title.id} title={title} />
            ))}
          </div>
          {!query && (
            <p className="mt-8 text-smoke/70">Enter a title to search HDToday.</p>
          )}
          {query && results.isLoading && (
            <p className="mt-8 text-smoke/70">Searching hdtoday.casa...</p>
          )}
          {query && !results.isLoading && results.data?.length === 0 && (
            <p className="mt-8 text-smoke/70">No matches for &quot;{query}&quot;. Try another title.</p>
          )}
        </main>
      </AppShell>
    </RequireAuth>
  );
}
