'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RequireAuth } from '@/components/require-auth';
import { useSession } from '@/components/session-provider';
import { api } from '@/lib/api';

export default function WatchPage() {
  const params = useParams<{ slug: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [restored, setRestored] = useState(false);
  const { token, activeProfile } = useSession();
  const title = useQuery({
    queryKey: ['watch-title', params.slug],
    queryFn: () => api.title(token!, params.slug),
    enabled: Boolean(token && params.slug)
  });
  const stream = useQuery({
    queryKey: ['watch-stream', params.slug],
    queryFn: () => api.titleStream(token!, params.slug),
    enabled: Boolean(token && params.slug)
  });
  const progress = useQuery({
    queryKey: ['progress', activeProfile?.id, title.data?.id],
    queryFn: () => api.progress(token!, activeProfile!.id, title.data!.id),
    enabled: Boolean(token && activeProfile && title.data)
  });
  const save = useMutation({
    mutationFn: (payload: { positionSeconds: number; durationSeconds: number; completed?: boolean }) =>
      api.saveProgress(token!, {
        profileId: activeProfile!.id,
        titleId: title.data!.id,
        positionSeconds: Math.floor(payload.positionSeconds),
        durationSeconds: Math.floor(payload.durationSeconds),
        completed: payload.completed
      })
  });

  const sourceUrl =
    stream.data?.streamUrl ?? title.data?.videoUrl ?? title.data?.trailerUrl ?? title.data?.episodes[0]?.videoUrl;
  const streamType = stream.data?.streamType ?? (sourceUrl ? inferStreamType(sourceUrl) : null);
  const embedUrl = sourceUrl && streamType === 'embed' ? sourceUrl : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !progress.data || restored) return;
    video.currentTime = progress.data.positionSeconds;
    setRestored(true);
  }, [progress.data, restored]);

  function saveCurrent(completed = false) {
    const video = videoRef.current;
    if (!video || !title.data || !activeProfile || !Number.isFinite(video.duration)) return;
    save.mutate({
      positionSeconds: video.currentTime,
      durationSeconds: video.duration,
      completed
    });
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <div className="absolute left-4 top-4 z-10">
          <Link href={`/title/${params.slug}`} className="rounded-md bg-black/72 px-4 py-2 font-black">
            Back
          </Link>
        </div>
        {(title.isLoading || stream.isLoading) && (
          <div className="grid h-screen place-items-center text-smoke/70">Loading stream...</div>
        )}
        {stream.isError && !sourceUrl && (
          <div className="grid h-screen place-items-center px-6 text-center text-smoke/70">
            Could not load the stream for this title. Try searching again to refresh catalog entries.
          </div>
        )}
        {title.data && embedUrl ? (
          <div className="grid h-screen w-screen place-items-center bg-black">
            <iframe
              src={embedUrl}
              title={`${title.data.name} stream`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="origin"
              className="h-[56.25vw] max-h-screen w-screen max-w-[177.78vh] border-0"
            />
          </div>
        ) : null}
        {title.data && !embedUrl && sourceUrl ? (
          <video
            ref={videoRef}
            src={sourceUrl}
            poster={stream.data?.posterUrl ?? title.data.backdropUrl ?? undefined}
            className="h-screen w-screen bg-black object-contain"
            controls
            autoPlay
            playsInline
            onPause={() => saveCurrent(false)}
            onEnded={() => saveCurrent(true)}
            onTimeUpdate={(event) => {
              const current = Math.floor(event.currentTarget.currentTime);
              if (current > 0 && current % 25 === 0) {
                saveCurrent(false);
              }
            }}
          />
        ) : null}
      </main>
    </RequireAuth>
  );
}

function inferStreamType(url: string): 'embed' | 'video' {
  if (url.includes('youtube.com/embed/') || /vsembed\.ru|cloudnestra|\/embed\//i.test(url)) {
    return 'embed';
  }

  return 'video';
}
