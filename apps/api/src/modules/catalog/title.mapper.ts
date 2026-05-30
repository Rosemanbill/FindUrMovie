import { AssetKind } from '@prisma/client';

type TitleRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  aiSummary: string | null;
  type: string;
  releaseYear: number;
  runtimeMinutes: number | null;
  maturityRating: string;
  language: string;
  cast: string[];
  moods: string[];
  tags: string[];
  popularity: number;
  genres?: { id: string; name: string; slug: string }[];
  assets?: { kind: AssetKind; url: string; altText: string | null }[];
  episodes?: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string;
    description: string;
    runtimeMinutes: number;
    videoUrl: string;
  }[];
};

export function mapTitle(title: TitleRecord) {
  const asset = (kind: AssetKind) => title.assets?.find((item) => item.kind === kind)?.url ?? null;

  return {
    id: title.id,
    slug: title.slug,
    name: title.name,
    description: title.description,
    aiSummary: title.aiSummary,
    type: title.type,
    releaseYear: title.releaseYear,
    runtimeMinutes: title.runtimeMinutes,
    maturityRating: title.maturityRating,
    language: title.language,
    cast: title.cast,
    moods: title.moods,
    tags: title.tags,
    popularity: title.popularity,
    genres: title.genres ?? [],
    posterUrl: asset(AssetKind.POSTER),
    backdropUrl: asset(AssetKind.BACKDROP),
    trailerUrl: asset(AssetKind.TRAILER),
    videoUrl: asset(AssetKind.VIDEO),
    episodes: title.episodes ?? []
  };
}

export const titleInclude = {
  genres: true,
  assets: true,
  episodes: {
    orderBy: [{ seasonNumber: 'asc' as const }, { episodeNumber: 'asc' as const }]
  }
};
