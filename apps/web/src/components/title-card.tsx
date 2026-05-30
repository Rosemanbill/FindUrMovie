'use client';

import Link from 'next/link';
import { Title } from '@/lib/types';

export function TitleCard({ title }: { title: Title }) {
  return (
    <Link
      href={`/title/${title.slug}`}
      className="group block w-40 shrink-0 rounded-md bg-white/8 transition hover:-translate-y-1 hover:bg-white/12 sm:w-48"
    >
      <img
        src={title.posterUrl ?? 'https://picsum.photos/seed/streamverse-fallback/720/1080'}
        alt={`${title.name} poster`}
        className="aspect-[2/3] w-full rounded-t-md object-cover"
      />
      <div className="space-y-1 px-3 py-3">
        <h3 className="line-clamp-1 font-black text-white">{title.name}</h3>
        <p className="line-clamp-1 text-xs font-bold uppercase text-limeglass">
          {title.releaseYear} · {title.maturityRating}
        </p>
        {typeof title.progress === 'number' && (
          <div className="h-1 rounded-md bg-white/14" aria-label={`${title.progress}% watched`}>
            <div className="h-1 rounded-md bg-ember" style={{ width: `${title.progress}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}
