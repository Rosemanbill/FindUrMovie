'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { TitleRow } from '@/components/title-row';
import { api } from '@/lib/api';

export default function TitlePage() {
  const params = useParams<{ slug: string }>();
  const { token, activeProfile } = useSession();
  const queryClient = useQueryClient();
  const title = useQuery({
    queryKey: ['title', params.slug],
    queryFn: () => api.title(token!, params.slug),
    enabled: Boolean(token && params.slug)
  });
  const similar = useQuery({
    queryKey: ['similar', title.data?.id, activeProfile?.id],
    queryFn: () => api.similar(token!, title.data!.id, activeProfile!.id),
    enabled: Boolean(token && title.data && activeProfile)
  });
  const addList = useMutation({
    mutationFn: () => api.addWatchlist(token!, activeProfile!.id, title.data!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist', activeProfile?.id] })
  });
  const rate = useMutation({
    mutationFn: (value: 'LIKE' | 'DISLIKE') => api.rate(token!, activeProfile!.id, title.data!.id, value)
  });

  return (
    <RequireAuth>
      <AppShell>
        {title.data && (
          <main>
            <section
              className="min-h-[560px] bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(8,8,8,0.97), rgba(8,8,8,0.52), rgba(8,8,8,0.86)), linear-gradient(0deg, #080808, rgba(8,8,8,0.1) 52%), url(${title.data.backdropUrl})`
              }}
            >
              <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-8 px-5 py-12 md:grid-cols-[220px_1fr]">
                <img
                  src={title.data.posterUrl ?? 'https://picsum.photos/seed/streamverse-detail/720/1080'}
                  alt={`${title.data.name} poster`}
                  className="hidden aspect-[2/3] w-full rounded-md object-cover md:block"
                />
                <div className="max-w-3xl">
                  <p className="mb-3 text-sm font-black uppercase text-limeglass">
                    {title.data.type === 'MOVIE' ? 'Movie' : 'Series'}
                  </p>
                  <h1 className="mb-4 text-5xl font-black leading-tight text-white">{title.data.name}</h1>
                  <p className="mb-5 text-lg leading-8 text-smoke/82">
                    {title.data.aiSummary ?? title.data.description}
                  </p>
                  <p className="mb-7 max-w-2xl leading-7 text-smoke/72">{title.data.description}</p>
                  <div className="mb-7 flex flex-wrap gap-2 text-sm font-bold text-smoke/78">
                    <span>{title.data.releaseYear}</span>
                    <span>{title.data.maturityRating}</span>
                    <span>{title.data.runtimeMinutes ? `${title.data.runtimeMinutes} min` : title.data.type}</span>
                    {title.data.genres.map((genre) => (
                      <span key={genre.id}>{genre.name}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/watch/${title.data.slug}`}
                      className="rounded-md bg-white px-6 py-3 font-black text-black hover:bg-smoke"
                    >
                      Play
                    </Link>
                    <button
                      onClick={() => addList.mutate()}
                      className="rounded-md bg-white/14 px-6 py-3 font-black text-white hover:bg-white/22"
                    >
                      My List
                    </button>
                    <button
                      onClick={() => rate.mutate('LIKE')}
                      className="rounded-md bg-limeglass px-6 py-3 font-black text-black"
                    >
                      Like
                    </button>
                    <button
                      onClick={() => rate.mutate('DISLIKE')}
                      className="rounded-md bg-white/10 px-6 py-3 font-black text-white"
                    >
                      Not for Me
                    </button>
                  </div>
                  <p className="mt-7 text-sm text-smoke/62">Cast: {title.data.cast.join(', ')}</p>
                </div>
              </div>
            </section>
            {similar.data && <TitleRow label="More Like This" titles={similar.data} />}
          </main>
        )}
      </AppShell>
    </RequireAuth>
  );
}
