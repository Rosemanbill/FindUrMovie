import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parseMovieclubListFromHtml,
  parseMovieclubStreamFromHtml
} from '../admin/movieclub-hd.parser';

@Injectable()
export class MovieclubHdService {
  constructor(private readonly config: ConfigService) {}

  async search(query: string, limit = 24) {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const html = await this.fetchHtml(this.buildSearchPath(trimmed));
    return parseMovieclubListFromHtml(html).slice(0, limit);
  }

  async resolveStream(type: 'movie' | 'serie', slug: string) {
    const html = await this.fetchHtml(this.buildStreamPath(type, slug));
    const streamUrl = parseMovieclubStreamFromHtml(html);
    if (!streamUrl) {
      throw new NotFoundException('Stream source was not found for this title.');
    }

    return streamUrl;
  }

  private buildSearchPath(query: string) {
    const configuredPath = this.config.get<string>('PROVIDER_SEARCH_PATH');
    if (configuredPath && configuredPath !== '__REPLACE_ME__') {
      return configuredPath.replace('{query}', encodeURIComponent(query));
    }

    return `/?s=${encodeURIComponent(query)}`;
  }

  private buildStreamPath(type: 'movie' | 'serie', slug: string) {
    const configuredPath = this.config.get<string>('PROVIDER_STREAM_PATH');
    if (configuredPath && configuredPath !== '__REPLACE_ME__') {
      return configuredPath
        .replace('{type}', type)
        .replace('{slug}', slug);
    }

    return `/${type}/${slug}/?vod=1080p`;
  }

  private async fetchHtml(path: string) {
    const apiBase = this.config.get<string>('PROVIDER_API_BASE_URL');
    if (!apiBase) {
      throw new ServiceUnavailableException('PROVIDER_API_BASE_URL is not configured.');
    }

    const response = await fetch(`${apiBase}${path}`, {
      headers: this.buildHeaders(path)
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Provider request failed: ${response.status}`);
    }

    return response.text();
  }

  private buildHeaders(path: string) {
    const headers = new Headers({
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    });

    const authHeader = this.config.get<string>('PROVIDER_AUTH_HEADER');
    const authValue = this.config.get<string>('PROVIDER_AUTH_VALUE');
    if (authHeader && authValue) {
      headers.set(authHeader, authValue);
    }

    const apiBase = this.config.get<string>('PROVIDER_API_BASE_URL');
    if (apiBase) {
      headers.set('Referer', `${apiBase.replace(/\/$/, '')}${path.split('?')[0]}`);
    }

    return headers;
  }
}
