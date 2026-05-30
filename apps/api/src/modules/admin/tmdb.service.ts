import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TitleType } from '@prisma/client';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';
type ProviderListResponse = {
  results?: Array<{
    id: string | number;
    title?: string;
    name?: string;
    isSeries?: boolean;
  }>;
  items?: Array<{
    id: string | number;
    title?: string;
    name?: string;
    isSeries?: boolean;
  }>;
};

type ProviderDetailsResponse = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  overview?: string;
  year?: number | string;
  releaseYear?: number | string;
  runtime?: number;
  runtimeMinutes?: number;
  rating?: string;
  maturityRating?: string;
  language?: string;
  genres?: string[];
  cast?: string[];
  moods?: string[];
  tags?: string[];
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  videoUrl?: string;
  isSeries?: boolean;
};

type TmdbListItem = {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
};

type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official?: boolean;
};

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: TmdbGenre[];
  popularity?: number;
  runtime?: number | null;
  number_of_seasons?: number;
  vote_average?: number;
  adult?: boolean;
  videos?: { results?: TmdbVideo[] };
  credits?: { cast?: Array<{ name: string }> };
};

@Injectable()
export class TmdbService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBase = 'https://image.tmdb.org/t/p/original';


  constructor(private readonly config: ConfigService) {}

  async importTitles(input: { query?: string; mediaType?: 'movie' | 'tv' | 'all'; limit?: number }) {
    const list = await this.fetchJson<ProviderListResponse>(
      `/your-search-or-list-endpoint?q=${encodeURIComponent(input.query ?? '')}`
    );

    const items = (list.results ?? list.items ?? []).slice(0, input.limit ?? 20);
    const titles = await Promise.all(
      items.map(async (item) => {
        const details = await this.fetchJson<ProviderDetailsResponse>(
          `/your-details-endpoint/${item.id}`
        );

        return this.mapProviderDetails(details, item);
      })
    );

    return titles.filter((title): title is CreateTitleDto => Boolean(title));
  }

  private async fetchJson<T>(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Provider request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private mapProviderDetails(
    details: ProviderDetailsResponse,
    item: { id: string | number; title?: string; name?: string; isSeries?: boolean }
  ): CreateTitleDto | null {
    const name = details.title ?? details.name ?? item.title ?? item.name;
    const description = details.description ?? details.overview ?? `${name ?? 'Title'} imported from provider.`;
    const posterUrl = details.posterUrl;

    if (!name || !posterUrl) {
      return null;
    }

    const releaseYear = this.numberOrFallback(details.year ?? details.releaseYear, new Date().getFullYear());
    const type = details.isSeries ?? item.isSeries ? TitleType.SERIES : TitleType.MOVIE;
    const genres = details.genres?.length ? details.genres : ['Drama'];

    return {
      slug: this.slugify(name),
      name,
      description,
      type,
      releaseYear,
      runtimeMinutes: this.numberOrFallback(details.runtime ?? details.runtimeMinutes, 90),
      maturityRating: details.rating ?? details.maturityRating ?? 'PG-13',
      language: details.language ?? 'English',
      genres,
      cast: details.cast ?? [],
      moods: details.moods?.length ? details.moods : ['cinematic'],
      tags: details.tags?.length ? details.tags : genres,
      posterUrl,
      backdropUrl: details.backdropUrl ?? posterUrl,
      trailerUrl: details.trailerUrl,
      videoUrl: details.videoUrl ?? details.trailerUrl ?? posterUrl
    };
  }

  private mapDetails(details: TmdbDetails, mediaType: 'movie' | 'tv'): CreateTitleDto | null {
    const name = details.title ?? details.name;
    const description = details.overview?.trim();
    const yearRaw = details.release_date ?? details.first_air_date;
    const releaseYear = yearRaw ? Number.parseInt(yearRaw.slice(0, 4), 10) : new Date().getFullYear();
    const posterPath = details.poster_path ? `${this.imageBase}${details.poster_path}` : null;
    const backdropPath = details.backdrop_path ? `${this.imageBase}${details.backdrop_path}` : posterPath;
    const trailer = this.pickYoutubeVideo(details.videos?.results ?? []);

    if (!name || !description || !posterPath || !backdropPath || !trailer) {
      return null;
    }

    const cast = (details.credits?.cast ?? []).slice(0, 5).map((person) => person.name);
    const genres = (details.genres ?? []).slice(0, 4).map((genre) => genre.name);
    const slugBase = `${name}-${details.id}`;
    const embedUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;

    return {
      slug: slugBase
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      name,
      description,
      type: mediaType === 'tv' ? TitleType.SERIES : TitleType.MOVIE,
      releaseYear,
      runtimeMinutes: details.runtime ?? (mediaType === 'tv' ? 45 : 110),
      maturityRating: details.adult ? 'R' : mediaType === 'tv' ? 'TV-14' : 'PG-13',
      language: 'English',
      genres: genres.length ? genres : ['Drama'],
      cast,
      moods: this.moodsFor(genres, description),
      tags: this.tagsFor(name, genres, description),
      posterUrl: posterPath,
      backdropUrl: backdropPath,
      trailerUrl: embedUrl,
      videoUrl: embedUrl
    };
  }

  private pickYoutubeVideo(videos: TmdbVideo[]) {
    return (
      videos.find((video) => video.site === 'YouTube' && video.official && video.type === 'Trailer') ??
      videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ??
      videos.find((video) => video.site === 'YouTube')
    );
  }

  private moodsFor(genres: string[], description: string) {
    const text = `${genres.join(' ')} ${description}`.toLowerCase();
    const moods = new Set<string>();
    if (/(comedy|funny)/.test(text)) moods.add('funny');
    if (/(thriller|crime|mystery|dark)/.test(text)) moods.add('dark');
    if (/(adventure|action)/.test(text)) moods.add('intense');
    if (/(family|animation)/.test(text)) moods.add('family');
    if (/(romance|love)/.test(text)) moods.add('romantic');
    if (/(science fiction|sci-fi|space)/.test(text)) moods.add('smart');
    return Array.from(moods.size ? moods : new Set(['cinematic', 'buzzy']));
  }

  private tagsFor(name: string, genres: string[], description: string) {
    return Array.from(
      new Set(
        `${name} ${genres.join(' ')} ${description}`
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 3)
      )
    ).slice(0, 10);
  }

  private slugify(input: string) {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private numberOrFallback(value: string | number | undefined, fallback: number) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }
}
