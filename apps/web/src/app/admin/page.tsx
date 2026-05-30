'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { api } from '@/lib/api';

export default function AdminPage() {
  const { token, user } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [providerQuery, setProviderQuery] = useState('');
  const [providerLimit, setProviderLimit] = useState('20');
  const [harPath, setHarPath] = useState(
    'C:\\Users\\ritik\\Documents\\New project\\apps\\api\\data\\hdtoday.casa.har'
  );
  const [harLimit, setHarLimit] = useState('60');
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [name, setName] = useState('City of Glass');
  const [description, setDescription] = useState(
    'A detective follows a trail of impossible reflections through a rain-lit city.'
  );
  const seed = useMutation({
    mutationFn: () => api.adminSeed(token!),
    onSuccess: () => setMessage('Demo catalog is ready.')
  });
  const create = useMutation({
    mutationFn: () =>
      api.adminCreateTitle(token!, {
        slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        name,
        description,
        type: 'MOVIE',
        releaseYear: new Date().getFullYear(),
        runtimeMinutes: 96,
        maturityRating: 'PG-13',
        language: 'English',
        genres: ['Thriller', 'Drama'],
        cast: ['Demo Lead', 'Demo Support'],
        moods: ['mysterious', 'stylish'],
        tags: ['detective', 'city', 'mystery'],
        posterUrl: `https://picsum.photos/seed/streamverse-${encodeURIComponent(name)}-poster/720/1080`,
        backdropUrl: `https://picsum.photos/seed/streamverse-${encodeURIComponent(name)}-backdrop/1600/900`,
        trailerUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      }),
    onSuccess: (title) => setMessage(`${title.name} was added to the catalog.`)
  });
  const importTmdb = useMutation({
    mutationFn: () =>
      api.adminImportTmdb(token!, {
        query: tmdbQuery.trim() || undefined,
        mediaType: 'all',
        limit: 8
      }),
    onSuccess: (result) =>
      setMessage(
        result.imported
          ? `Imported ${result.imported} TMDb titles.`
          : 'No new TMDb titles were imported. Existing slugs may already be in the catalog.'
      )
  });
  const importHar = useMutation({
    mutationFn: () =>
      api.adminImportHar(token!, {
        filePath: harPath.trim() || undefined,
        limit: Number.parseInt(harLimit, 10) || 60
      }),
    onSuccess: (result) =>
      setMessage(
        result.imported
          ? `Imported ${result.imported} titles from HAR. Skipped ${result.skipped} duplicates.`
          : `No new HAR titles were imported. Skipped ${result.skipped} duplicates.`
      )
  });
  const importProviderTemplate = useMutation({
    mutationFn: () =>
      api.adminImportProviderTemplate(token!, {
        query: providerQuery.trim() || undefined,
        limit: Number.parseInt(providerLimit, 10) || 20
      }),
    onSuccess: (result) =>
      setMessage(
        result.imported
          ? `Imported ${result.imported} titles from your provider template. Skipped ${result.skipped} duplicates.`
          : `No new provider-template titles were imported. Skipped ${result.skipped} duplicates.`
      )
  });

  function runTmdbPreset(query: string) {
    setTmdbQuery(query);
    importTmdb.mutate();
  }

  function submitSeed(event: FormEvent) {
    event.preventDefault();
    seed.mutate();
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  function submitTmdbImport(event: FormEvent) {
    event.preventDefault();
    importTmdb.mutate();
  }

  function submitHarImport(event: FormEvent) {
    event.preventDefault();
    importHar.mutate();
  }

  function submitProviderTemplateImport(event: FormEvent) {
    event.preventDefault();
    importProviderTemplate.mutate();
  }

  return (
    <RequireAuth>
      <AppShell>
        <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
          <p className="mb-3 text-sm font-black uppercase text-limeglass">Admin</p>
          <h1 className="mb-5 text-4xl font-black text-white">Catalog operations</h1>
          {user?.role !== 'ADMIN' ? (
            <p className="text-smoke/72">Admin access is required.</p>
          ) : (
            <div className="space-y-10">
              <form onSubmit={submitSeed} className="space-y-5">
              <p className="max-w-2xl leading-7 text-smoke/76">
                Seed checks the catalog and creates starter content when the database is empty.
              </p>
              <button className="rounded-md bg-ember px-5 py-3 font-black text-white">Seed Demo Catalog</button>
              {message && <p className="text-limeglass">{message}</p>}
              {seed.error && (
                <p className="text-ember">{seed.error instanceof Error ? seed.error.message : 'Seed failed.'}</p>
              )}
              </form>

              <form onSubmit={submitCreate} className="grid max-w-2xl gap-4">
                <h2 className="text-2xl font-black text-white">Add a title</h2>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Title name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-28 w-full rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                  />
                </label>
                <button className="w-fit rounded-md bg-limeglass px-5 py-3 font-black text-black">
                  Create Title
                </button>
                {create.error && (
                  <p className="text-ember">
                    {create.error instanceof Error ? create.error.message : 'Create failed.'}
                  </p>
                )}
              </form>

              <form onSubmit={submitTmdbImport} className="grid max-w-2xl gap-4">
                <h2 className="text-2xl font-black text-white">Import from TMDb</h2>
                <p className="leading-7 text-smoke/76">
                  Pull trending movies and shows, or search for a specific title, then use YouTube trailers as the playable source.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => runTmdbPreset('bollywood')}
                    className="rounded-md bg-white/12 px-4 py-2 font-bold text-white"
                  >
                    Bollywood Picks
                  </button>
                  <button
                    type="button"
                    onClick={() => runTmdbPreset('hindi movies')}
                    className="rounded-md bg-white/12 px-4 py-2 font-bold text-white"
                  >
                    Hindi Movies
                  </button>
                  <button
                    type="button"
                    onClick={() => runTmdbPreset('indian drama')}
                    className="rounded-md bg-white/12 px-4 py-2 font-bold text-white"
                  >
                    Indian Drama
                  </button>
                  <button
                    type="button"
                    onClick={() => runTmdbPreset('cricket documentary')}
                    className="rounded-md bg-white/12 px-4 py-2 font-bold text-white"
                  >
                    Sports Stories
                  </button>
                </div>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Search term</span>
                  <input
                    value={tmdbQuery}
                    onChange={(event) => setTmdbQuery(event.target.value)}
                    placeholder="Leave blank to import trending titles"
                    className="w-full rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                  />
                </label>
                <button className="w-fit rounded-md bg-white px-5 py-3 font-black text-black">
                  Import TMDb Titles
                </button>
                {importTmdb.error && (
                  <p className="text-ember">
                    {importTmdb.error instanceof Error ? importTmdb.error.message : 'TMDb import failed.'}
                  </p>
                )}
              </form>

              <form onSubmit={submitHarImport} className="grid max-w-2xl gap-4">
                <h2 className="text-2xl font-black text-white">Import from HAR</h2>
                <p className="leading-7 text-smoke/76">
                  Read saved response bodies from a local HAR file and import titles, descriptions, tags, and artwork into the catalog.
                </p>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">HAR file path</span>
                  <input
                    value={harPath}
                    onChange={(event) => setHarPath(event.target.value)}
                    className="w-full rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Import limit</span>
                  <input
                    value={harLimit}
                    onChange={(event) => setHarLimit(event.target.value)}
                    className="w-40 rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                    inputMode="numeric"
                  />
                </label>
                <button className="w-fit rounded-md bg-ember px-5 py-3 font-black text-white">
                  Import HAR Titles
                </button>
                {importHar.error && (
                  <p className="text-ember">
                    {importHar.error instanceof Error ? importHar.error.message : 'HAR import failed.'}
                  </p>
                )}
              </form>

              <form onSubmit={submitProviderTemplateImport} className="grid max-w-2xl gap-4">
                <h2 className="text-2xl font-black text-white">Import from Custom Provider</h2>
                <p className="leading-7 text-smoke/76">
                  Use the backend provider template. You only need to fill in the base URL, list path, details path, and field mapping on the API side.
                </p>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Provider query</span>
                  <input
                    value={providerQuery}
                    onChange={(event) => setProviderQuery(event.target.value)}
                    placeholder="Optional search term"
                    className="w-full rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-smoke/78">Import limit</span>
                  <input
                    value={providerLimit}
                    onChange={(event) => setProviderLimit(event.target.value)}
                    className="w-40 rounded-md border border-white/14 bg-white/8 px-4 py-3 text-white"
                    inputMode="numeric"
                  />
                </label>
                <button className="w-fit rounded-md bg-white px-5 py-3 font-black text-black">
                  Import Provider Titles
                </button>
                {importProviderTemplate.error && (
                  <p className="text-ember">
                    {importProviderTemplate.error instanceof Error
                      ? importProviderTemplate.error.message
                      : 'Provider template import failed.'}
                  </p>
                )}
              </form>
            </div>
          )}
        </main>
      </AppShell>
    </RequireAuth>
  );
}
