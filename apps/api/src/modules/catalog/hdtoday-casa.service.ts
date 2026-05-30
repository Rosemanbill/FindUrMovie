import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildEmbedUrl,
  CasaMediaType,
  CasaTmdbItem,
  mapCasaItemToTitle
} from '../admin/hdtoday-casa.parser';

type TmdbListResponse = {
  results?: CasaTmdbItem[];
};

@Injectable()
export class HdtodayCasaService {
  constructor(private readonly config: ConfigService) {}

  async search(query: string, limit = 24) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const endpoint = `/search/multi?query=${encodeURIComponent(trimmed)}&page=1&include_adult=false`;
    const response = await this.fetchTmdb<TmdbListResponse>(endpoint);
    return (response.results ?? [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, limit);
  }

  async listPopular(limit = 24) {
    const response = await this.fetchTmdb<TmdbListResponse>('/movie/popular?page=1');
    return (response.results ?? []).slice(0, limit);
  }

  async getDetails(type: CasaMediaType, tmdbId: number) {
    return this.fetchTmdb<CasaTmdbItem & { genres?: Array<{ id: number; name: string }> }>(
      `/${type}/${tmdbId}`
    );
  }

  async resolveStream(type: CasaMediaType, tmdbId: number, season = 1, episode = 1) {
    const embedBase = this.config.get<string>('PROVIDER_EMBED_BASE_URL') ?? 'https://vsembed.ru';
    return buildEmbedUrl(
      {
        source: 'casa',
        type,
        tmdbId,
        season: type === 'tv' ? season : undefined,
        episode: type === 'tv' ? episode : undefined
      },
      embedBase
    );
  }

  mapSearchResults(items: CasaTmdbItem[]) {
    return items.map((item) => mapCasaItemToTitle(item)).filter(Boolean);
  }

  private async fetchTmdb<T>(endpoint: string) {
    const apiBase = this.config.get<string>('PROVIDER_API_BASE_URL');
    if (!apiBase) {
      throw new ServiceUnavailableException('PROVIDER_API_BASE_URL is not configured.');
    }

    const apiPath = this.config.get<string>('PROVIDER_API_PATH') ?? '/api/tmdb';
    const url = `${apiBase}${apiPath}?endpoint=${encodeURIComponent(endpoint)}`;
    const response = await fetch(url, {
      headers: this.buildHeaders(`${apiBase}/movies`)
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Provider request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private buildHeaders(referer: string) {
    const headers = new Headers({
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Referer: referer
    });

    const authHeader = this.config.get<string>('PROVIDER_AUTH_HEADER');
    const authValue = this.config.get<string>('PROVIDER_AUTH_VALUE');
    if (authHeader && authValue) {
      headers.set(authHeader, authValue);
    }

    return headers;
  }
}
