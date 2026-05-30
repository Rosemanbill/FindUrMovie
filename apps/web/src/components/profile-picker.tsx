'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from './session-provider';

export function ProfilePicker() {
  const { token, profiles, selectProfile, refreshProfiles } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function createProfile(event: FormEvent) {
    event.preventDefault();
    if (!token || !name.trim()) return;

    setBusy(true);
    await api.createProfile(token, { name: name.trim() });
    setName('');
    await refreshProfiles();
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-12 text-smoke">
      <section className="mx-auto max-w-5xl">
        <p className="mb-10 text-2xl font-black text-ember">StreamVerse</p>
        <h1 className="mb-8 text-center text-4xl font-black text-white">Who is watching?</h1>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => selectProfile(profile)}
              className="group rounded-md p-2 text-center transition hover:bg-white/8"
            >
              <img
                src={profile.avatarUrl}
                alt={`${profile.name} avatar`}
                className="aspect-square w-full rounded-md object-cover transition group-hover:scale-[1.02]"
              />
              <span className="mt-3 block text-lg font-bold text-smoke/82 group-hover:text-white">
                {profile.name}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={createProfile} className="mx-auto mt-12 flex max-w-md gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add profile"
            className="min-w-0 flex-1 rounded-md border border-white/16 bg-white/8 px-4 py-3 text-white"
          />
          <button
            disabled={busy}
            className="rounded-md bg-limeglass px-5 py-3 font-black text-black disabled:opacity-60"
          >
            Add
          </button>
        </form>
      </section>
    </main>
  );
}
