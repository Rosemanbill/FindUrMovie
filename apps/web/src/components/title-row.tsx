'use client';

import { Title } from '@/lib/types';
import { TitleCard } from './title-card';

export function TitleRow({ label, titles }: { label: string; titles: Title[] }) {
  if (titles.length === 0) return null;

  return (
    <section className="py-6" aria-labelledby={`row-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="mx-auto max-w-7xl px-5">
        <h2 id={`row-${label.replace(/\s+/g, '-').toLowerCase()}`} className="mb-4 text-2xl font-black text-white">
          {label}
        </h2>
      </div>
      <div className="content-row flex gap-4 overflow-x-auto px-5 pb-3 md:px-[max(1.25rem,calc((100vw-80rem)/2+1.25rem))]">
        {titles.map((title) => (
          <TitleCard key={title.id} title={title} />
        ))}
      </div>
    </section>
  );
}
