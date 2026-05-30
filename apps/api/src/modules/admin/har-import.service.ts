import { Injectable } from '@nestjs/common';
import { TitleType } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';
import { HdtodayCasaService } from '../catalog/hdtoday-casa.service';
import { mapCasaDetailsToTitle, mapCasaItemToTitle } from './hdtoday-casa.parser';
import { mapMovieclubListItemToTitle, parseMovieclubListFromHtml } from './movieclub-hd.parser';

type JsonRecord = Record<string, unknown>;

type HarEntry = {
  request?: { url?: string };
  response?: { content?: { text?: string; mimeType?: string } };
};

@Injectable()
export class HarImportService {
  constructor(private readonly hdtoday: HdtodayCasaService) {}

  async importFromHar(filePath: string, limit = 80) {
    const resolvedPath = resolve(filePath);
    const raw = await readFile(resolvedPath, 'utf8');
    const har = JSON.parse(raw) as { log?: { entries?: HarEntry[] } };
    const entries = har.log?.entries ?? [];

    if (entries.some((entry) => (entry.request?.url ?? '').includes('/api/tmdb'))) {
      return this.importCasaFromHar(entries, limit);
    }

    const movieclubImports = this.importMovieclubFromHar(entries, limit);
    if (movieclubImports.length > 0) {
      return movieclubImports;
    }

    return this.importHotstarFromHar(entries, limit);
  }

  private async importCasaFromHar(entries: HarEntry[], limit: number) {
    const imports = new Map<string, CreateTitleDto>();
    const endpoints = new Set<string>();

    for (const entry of entries) {
      const endpoint = this.extractCasaEndpoint(entry.request?.url ?? '');
      if (endpoint) {
        endpoints.add(endpoint);
      }
    }

    for (const endpoint of endpoints) {
      if (imports.size >= limit) {
        break;
      }

      try {
        if (endpoint.startsWith('/search/')) {
          const query = this.extractSearchQuery(endpoint);
          if (!query) {
            continue;
          }

          const results = await this.hdtoday.search(query, limit);
          for (const item of results) {
            const title = mapCasaItemToTitle(item);
            if (title && !imports.has(title.slug)) {
              imports.set(title.slug, title);
            }
          }
          continue;
        }

        const match = endpoint.match(/^\/(movie|tv)\/(\d+)/);
        if (!match) {
          continue;
        }

        const type = match[1] as 'movie' | 'tv';
        const tmdbId = Number.parseInt(match[2], 10);
        const details = await this.hdtoday.getDetails(type, tmdbId);
        const title = mapCasaDetailsToTitle(details, type);
        if (title && !imports.has(title.slug)) {
          imports.set(title.slug, title);
        }
      } catch {
        continue;
      }
    }

    return Array.from(imports.values()).slice(0, limit);
  }

  private extractCasaEndpoint(url: string) {
    if (!url.includes('/api/tmdb')) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const endpoint = parsed.searchParams.get('endpoint');
      return endpoint ? decodeURIComponent(endpoint) : null;
    } catch {
      return null;
    }
  }

  private extractSearchQuery(endpoint: string) {
    const match = endpoint.match(/query=([^&]+)/);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
  }

  private importMovieclubFromHar(entries: HarEntry[], limit: number) {
    const imports = new Map<string, CreateTitleDto>();

    for (const entry of entries) {
      const mimeType = entry.response?.content?.mimeType ?? '';
      const text = entry.response?.content?.text;
      if (!text || !mimeType.includes('html')) {
        continue;
      }

      for (const item of parseMovieclubListFromHtml(text)) {
        if (imports.size >= limit) {
          break;
        }

        const title = mapMovieclubListItemToTitle(item);
        if (title && !imports.has(title.slug)) {
          imports.set(title.slug, title);
        }
      }

      if (imports.size >= limit) {
        break;
      }
    }

    return Array.from(imports.values());
  }

  private importHotstarFromHar(entries: HarEntry[], limit: number) {
    const imports = new Map<string, CreateTitleDto>();

    for (const entry of entries) {
      const text = entry.response?.content?.text;
      if (!text) continue;

      const parsed = this.safeParseJson(text);
      if (!parsed) continue;

      this.walk(parsed, (node) => {
        if (imports.size >= limit) return;
        const candidate = this.extractHotstarCandidate(node);
        if (candidate && !imports.has(candidate.slug)) {
          imports.set(candidate.slug, candidate);
        }
      });

      if (imports.size >= limit) {
        break;
      }
    }

    return Array.from(imports.values());
  }

  private extractHotstarCandidate(node: unknown): CreateTitleDto | null {
    if (!this.isRecord(node)) return null;

    const expanded = this.asRecord(node.expanded_content_poster);
    const info = this.asRecord(expanded?.content_info);
    if (!expanded || !info) return null;

    const contentId =
      this.readString(node.content_id) ??
      this.readString(this.asRecord(node.watchlist_cta)?.info && this.asRecord(this.asRecord(node.watchlist_cta)?.info)?.content_id) ??
      this.findString(node, 'content_id');
    const title = this.readString(info.title) ?? this.readString(expanded.title);
    const description = this.readString(info.description);

    if (!contentId || !title || !description) return null;
    if (/^s\d+\s*e\d+$/i.test(title.trim())) return null;

    const tags = this.extractTags(info.tags);
    const pageSlug = this.findPageSlug(node);
    const posterUrl = this.normalizeHotstarImageUrl(this.readString(this.asRecord(expanded.image)?.src));
    const logoUrl = this.normalizeHotstarImageUrl(this.readString(this.asRecord(info.title_cutout)?.src));
    const type = pageSlug?.includes('/shows/') ? TitleType.SERIES : TitleType.MOVIE;
    const releaseYear = this.extractReleaseYear(tags) ?? new Date().getFullYear();
    const runtimeMinutes = this.extractRuntime(tags);
    const maturityRating = this.extractMaturity(tags) ?? (type === TitleType.SERIES ? 'TV-14' : 'PG-13');
    const language = this.extractLanguage(tags) ?? 'Hindi';
    const genres = this.extractGenres(tags, type);
    const moods = this.extractMoods(tags, description);
    const cleanedTags = Array.from(
      new Set(
        tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 14)
      )
    );

    return {
      slug: `hotstar-${contentId}-${this.slugify(title).slice(0, 48)}`,
      name: title.trim(),
      description: description.trim(),
      type,
      releaseYear,
      runtimeMinutes: runtimeMinutes ?? undefined,
      maturityRating,
      language,
      genres,
      cast: [],
      moods,
      tags: cleanedTags.length ? cleanedTags : genres,
      posterUrl:
        posterUrl ?? `https://picsum.photos/seed/${encodeURIComponent(`hotstar-poster-${contentId}`)}/720/1080`,
      backdropUrl:
        logoUrl ??
        posterUrl ??
        `https://picsum.photos/seed/${encodeURIComponent(`hotstar-backdrop-${contentId}`)}/1600/900`,
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    };
  }

  private walk(node: unknown, visit: (node: unknown) => void) {
    visit(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        this.walk(item, visit);
      }
      return;
    }

    if (!this.isRecord(node)) return;
    for (const value of Object.values(node)) {
      if (typeof value === 'object' && value !== null) {
        this.walk(value, visit);
      }
    }
  }

  private extractTags(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (this.isRecord(item) ? this.readString(item.value) : null))
      .filter((item): item is string => Boolean(item));
  }

  private extractReleaseYear(tags: string[]) {
    return tags
      .map((tag) => Number.parseInt(tag, 10))
      .find((year) => Number.isInteger(year) && year >= 1900 && year <= 2100);
  }

  private extractRuntime(tags: string[]) {
    for (const tag of tags) {
      const match = tag.match(/(?:(\d+)h)?\s*(?:(\d+)m)/i);
      if (!match) continue;
      const hours = Number.parseInt(match[1] ?? '0', 10);
      const minutes = Number.parseInt(match[2] ?? '0', 10);
      const total = hours * 60 + minutes;
      if (total > 0) return total;
    }

    return undefined;
  }

  private extractMaturity(tags: string[]) {
    return tags.find((tag) => /^(u\/a|ua|a|u|tv-|pg|g|r)/i.test(tag));
  }

  private extractLanguage(tags: string[]) {
    const languages = [
      'Hindi',
      'English',
      'Tamil',
      'Telugu',
      'Kannada',
      'Malayalam',
      'Bengali',
      'Marathi'
    ];
    return tags.find((tag) => languages.includes(tag));
  }

  private extractGenres(tags: string[], type: TitleType) {
    const knownGenres = new Set([
      'Action',
      'Adventure',
      'Animation',
      'Comedy',
      'Crime',
      'Documentary',
      'Drama',
      'Family',
      'Fantasy',
      'History',
      'Horror',
      'Music',
      'Mystery',
      'Romance',
      'Science Fiction',
      'Sci-Fi',
      'Sports',
      'Thriller',
      'War'
    ]);
    const genres = tags.filter((tag) => knownGenres.has(tag));
    if (genres.length > 0) {
      return genres.slice(0, 4);
    }

    return [type === TitleType.SERIES ? 'Drama' : 'Action'];
  }

  private extractMoods(tags: string[], description: string) {
    const moodSeed = `${tags.join(' ')} ${description}`.toLowerCase();
    const moods = new Set<string>();
    if (/(feel good|quirky|funny|comedy)/.test(moodSeed)) moods.add('funny');
    if (/(thriller|mystery|crime|dark)/.test(moodSeed)) moods.add('dark');
    if (/(love|romance|lovesick)/.test(moodSeed)) moods.add('romantic');
    if (/(friendship|family|kids)/.test(moodSeed)) moods.add('family');
    if (/(action|rebellion|revenge|cricket|sports)/.test(moodSeed)) moods.add('intense');
    if (/(inspirational|thought-provoking|political)/.test(moodSeed)) moods.add('smart');
    return Array.from(moods.size ? moods : new Set(['cinematic']));
  }

  private findPageSlug(node: unknown) {
    const serialized = JSON.stringify(node);
    const match = serialized.match(/\/in\/(?:movies|shows)\/[^"]+/);
    return match?.[0] ?? null;
  }

  private normalizeHotstarImageUrl(value: string | null) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('sources/')) {
      return `https://img1.hotstarext.com/image/upload/${value}`;
    }

    return null;
  }

  private slugify(input: string) {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private safeParseJson(text: string) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }

  private findString(node: unknown, key: string): string | null {
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = this.findString(item, key);
        if (found) return found;
      }
      return null;
    }

    if (!this.isRecord(node)) return null;
    const direct = this.readString(node[key]);
    if (direct) return direct;
    for (const value of Object.values(node)) {
      const found = this.findString(value, key);
      if (found) return found;
    }
    return null;
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private asRecord(value: unknown) {
    return this.isRecord(value) ? value : null;
  }
}
