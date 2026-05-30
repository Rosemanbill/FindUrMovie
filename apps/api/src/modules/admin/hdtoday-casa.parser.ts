import { TitleType } from '@prisma/client';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';

const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type CasaMediaType = 'movie' | 'tv';

export type CasaTmdbItem = {
  id: number;
  media_type?: CasaMediaType | 'person';
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
};

export type CasaProviderRef = {
  source: 'casa';
  type: CasaMediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
};

const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

export function mapCasaItemToTitle(item: CasaTmdbItem): CreateTitleDto | null {
  const type = resolveMediaType(item);
  if (!type) {
    return null;
  }

  const name = (type === TitleType.MOVIE ? item.title : item.name)?.trim();
  const description = item.overview?.trim();
  const posterUrl = toPosterUrl(item.poster_path);
  const backdropUrl = toBackdropUrl(item.backdrop_path) ?? posterUrl;

  if (!name || !description || !posterUrl || !backdropUrl) {
    return null;
  }

  const genres = mapGenreIds(item.genre_ids);
  const releaseYear = extractYear(item) ?? new Date().getFullYear();
  const mediaType = type === TitleType.MOVIE ? 'movie' : 'tv';

  return {
    slug: buildSlug(mediaType, item.id),
    name,
    description,
    type,
    releaseYear,
    runtimeMinutes: type === TitleType.SERIES ? 45 : 110,
    maturityRating: type === TitleType.SERIES ? 'TV-14' : 'PG-13',
    language: 'English',
    genres,
    cast: [],
    moods: extractMoods(genres, description),
    tags: withProviderTags(buildTags(name, genres, description), mediaType, item.id),
    posterUrl,
    backdropUrl,
    videoUrl: SAMPLE_VIDEO_URL
  };
}

export function mapCasaDetailsToTitle(
  details: CasaTmdbItem & {
    genres?: Array<{ id: number; name: string }>;
    runtime?: number | null;
    number_of_seasons?: number;
    adult?: boolean;
  },
  type: CasaMediaType
): CreateTitleDto | null {
  const titleType = type === 'tv' ? TitleType.SERIES : TitleType.MOVIE;
  const name = (titleType === TitleType.MOVIE ? details.title : details.name)?.trim();
  const description = details.overview?.trim();
  const posterUrl = toPosterUrl(details.poster_path);
  const backdropUrl = toBackdropUrl(details.backdrop_path) ?? posterUrl;

  if (!name || !description || !posterUrl || !backdropUrl) {
    return null;
  }

  const genres =
    details.genres?.map((genre) => genre.name).slice(0, 4) ??
    mapGenreIds(details.genre_ids);

  return {
    slug: buildSlug(type, details.id),
    name,
    description,
    type: titleType,
    releaseYear: extractYear(details) ?? new Date().getFullYear(),
    runtimeMinutes:
      details.runtime ??
      (titleType === TitleType.SERIES ? 45 : 110),
    maturityRating: details.adult ? 'R' : titleType === TitleType.SERIES ? 'TV-14' : 'PG-13',
    language: 'English',
    genres: genres.length ? genres : [titleType === TitleType.SERIES ? 'Drama' : 'Action'],
    cast: [],
    moods: extractMoods(genres, description),
    tags: withProviderTags(buildTags(name, genres, description), type, details.id),
    posterUrl,
    backdropUrl,
    videoUrl: SAMPLE_VIDEO_URL
  };
}

export function providerTag(type: CasaMediaType, tmdbId: number, season?: number, episode?: number) {
  if (type === 'tv') {
    return `provider:casa/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`;
  }

  return `provider:casa/movie/${tmdbId}`;
}

export function parseProviderRef(titleSlug: string, tags: string[] = []): CasaProviderRef | null {
  const tag = tags.find((entry) => entry.startsWith('provider:casa/'));
  if (tag) {
    const parts = tag.slice('provider:casa/'.length).split('/');
    const type = parts[0] as CasaMediaType;
    const tmdbId = Number.parseInt(parts[1] ?? '', 10);
    if ((type === 'movie' || type === 'tv') && Number.isFinite(tmdbId)) {
      return {
        source: 'casa',
        type,
        tmdbId,
        season: type === 'tv' ? Number.parseInt(parts[2] ?? '1', 10) || 1 : undefined,
        episode: type === 'tv' ? Number.parseInt(parts[3] ?? '1', 10) || 1 : undefined
      };
    }
  }

  const slugMatch = titleSlug.match(/^hdtoday-(movie|tv)--(\d+)$/);
  if (slugMatch) {
    return {
      source: 'casa',
      type: slugMatch[1] as CasaMediaType,
      tmdbId: Number.parseInt(slugMatch[2], 10),
      season: slugMatch[1] === 'tv' ? 1 : undefined,
      episode: slugMatch[1] === 'tv' ? 1 : undefined
    };
  }

  return null;
}

export function buildSlug(type: CasaMediaType, tmdbId: number) {
  return `hdtoday-${type}--${tmdbId}`;
}

export function buildEmbedUrl(
  ref: CasaProviderRef,
  embedBase = 'https://vsembed.ru'
) {
  if (ref.type === 'tv') {
    const season = ref.season ?? 1;
    const episode = ref.episode ?? 1;
    return `${embedBase}/embed/tv?tmdb=${ref.tmdbId}&season=${season}&episode=${episode}&autonext=1`;
  }

  return `${embedBase}/embed/movie?tmdb=${ref.tmdbId}`;
}

function resolveMediaType(item: CasaTmdbItem): TitleType | null {
  const mediaType = item.media_type ?? (item.title ? 'movie' : item.name ? 'tv' : undefined);
  if (mediaType === 'movie') return TitleType.MOVIE;
  if (mediaType === 'tv') return TitleType.SERIES;
  return null;
}

function toPosterUrl(path?: string | null) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/w500${path}`;
}

function toBackdropUrl(path?: string | null) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/w1280${path}`;
}

function mapGenreIds(ids?: number[]) {
  return (ids ?? [])
    .map((id) => GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 4);
}

function extractYear(item: CasaTmdbItem) {
  const raw = item.release_date ?? item.first_air_date;
  if (!raw) return undefined;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

function withProviderTags(tags: string[], type: CasaMediaType, tmdbId: number) {
  return Array.from(new Set([providerTag(type, tmdbId), ...tags]));
}

function buildTags(name: string, genres: string[], description: string) {
  return Array.from(
    new Set(
      `${name} ${genres.join(' ')} ${description}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 3)
    )
  ).slice(0, 12);
}

function extractMoods(genres: string[], description: string) {
  const text = `${genres.join(' ')} ${description}`.toLowerCase();
  const moods = new Set<string>();
  if (/(comedy|funny|quirky)/.test(text)) moods.add('funny');
  if (/(horror|thriller|crime|mystery|dark|nightmare)/.test(text)) moods.add('dark');
  if (/(action|war|revenge|intense)/.test(text)) moods.add('intense');
  if (/(family|kids|animation)/.test(text)) moods.add('family');
  if (/(romance|love|beloved|bride)/.test(text)) moods.add('romantic');
  if (/(science fiction|sci-fi|smart|political)/.test(text)) moods.add('smart');
  return Array.from(moods.size ? moods : new Set(['cinematic']));
}
