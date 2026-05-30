'use client';

import Link from 'next/link';
import { Title } from '@/lib/types';

export function Hero({ title }: { title: Title }) {
  return (
    <section
      className="relative min-h-[560px] bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(8,8,8,0.96), rgba(8,8,8,0.45), rgba(8,8,8,0.8)), linear-gradient(0deg, #080808, rgba(8,8,8,0.05) 48%), url(${title.backdropUrl})`
      }}
    >
      <div className="mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-black uppercase text-limeglass">Featured tonight</p>
          <h1 className="mb-4 text-5xl font-black leading-tight text-white">{title.name}</h1>
          <p className="mb-5 max-w-xl text-lg leading-8 text-smoke/82">{title.aiSummary ?? title.description}</p>
          <div className="mb-7 flex flex-wrap gap-2 text-sm font-bold text-smoke/78">
            <span>{title.releaseYear}</span>
            <span>{title.maturityRating}</span>
            <span>{title.runtimeMinutes ? `${title.runtimeMinutes} min` : title.type}</span>
            {title.genres.slice(0, 2).map((genre) => (
              <span key={genre.id}>{genre.name}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/watch/${title.slug}`}
              className="rounded-md bg-white px-6 py-3 font-black text-black transition hover:bg-smoke"
            >
              Play
            </Link>
            <Link
              href={`/title/${title.slug}`}
              className="rounded-md bg-white/14 px-6 py-3 font-black text-white transition hover:bg-white/22"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
