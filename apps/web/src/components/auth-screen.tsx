'use client';

import { FormEvent, useState } from 'react';
import { useSession } from './session-provider';

export function AuthScreen() {
  const { login, signup } = useSession();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('demo@streamverse.test');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Ritik');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup({ email, password, name, profileName: name || 'Viewer' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-smoke">
      <section
        className="grid min-h-screen place-items-center bg-cover bg-center px-5 py-10"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(8,8,8,0.95), rgba(8,8,8,0.58), rgba(8,8,8,0.88)), url(https://picsum.photos/seed/streamverse-auth/1800/1100)'
        }}
      >
        <div className="w-full max-w-5xl">
          <p className="mb-8 text-2xl font-black text-ember">StreamVerse</p>
          <div className="max-w-md">
            <p className="mb-3 text-sm font-bold uppercase text-limeglass">
              {mode === 'login' ? 'Welcome back' : 'Start watching'}
            </p>
            <h1 className="mb-4 text-5xl font-black leading-tight text-white">
              Find the next story that fits tonight.
            </h1>
            <p className="mb-8 max-w-sm text-base leading-7 text-smoke/78">
              Browse cinematic rows, save your list, resume instantly, and use practical AI search for moods,
              genres, and hidden matches.
            </p>

            <form onSubmit={submit} className="space-y-4" aria-label="Authentication form">
              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-smoke/82">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-md border border-white/16 bg-black/72 px-4 py-3 text-white"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-smoke/82">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md border border-white/16 bg-black/72 px-4 py-3 text-white"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-smoke/82">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-md border border-white/16 bg-black/72 px-4 py-3 text-white"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </label>

              {error && <p className="rounded-md bg-ember/18 px-4 py-3 text-sm text-white">{error}</p>}

              <button
                disabled={busy}
                className="w-full rounded-md bg-ember px-5 py-3 font-black text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {busy ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="mt-5 rounded-md px-1 py-2 text-left text-sm font-bold text-smoke/80 hover:text-white"
            >
              {mode === 'login' ? 'New here? Create an account.' : 'Already have an account? Sign in.'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
