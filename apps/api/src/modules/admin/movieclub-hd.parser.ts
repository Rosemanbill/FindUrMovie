import { TitleType } from '@prisma/client';
import { CreateTitleDto } from '../catalog/dto/create-title.dto';

export type MovieclubListItem = {
  type: 'movie' | 'serie';
  slug: string;
  name: string;
  posterUrl: string;
  description?: string;
};

const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const GRID_CARD_PATTERN =
  /<a href=\/(movie|serie)\/([^/>]+)\/?[^>]*class="[^"]*poster[^"]*">[\s\S]*?data-src=(https:\/\/i2\.wp\.com\/image\.tmdb\.org\/t\/p\/w185\/[^ >]+)[\s\S]*?alt="Watch Free ([^"]+) Full (?:Movies|Series)[^"]*"[\s\S]*?<h2 class="card-title[^"]*"[^>]*>([^<]+)</g;

const CAROUSEL_PATTERN =
  /<a href=\/(movie|serie)\/([^/>]+)\/?>[\s\S]*?<h2>([^<]+)<\/h2><p>([^<]+)</g;

export function parseMovieclubListFromHtml(html: string): MovieclubListItem[] {
  const items = new Map<string, MovieclubListItem>();

  for (const match of html.matchAll(CAROUSEL_PATTERN)) {
    const type = match[1] as 'movie' | 'serie';
    const slug = match[2];
    const key = `${type}:${slug}`;
    items.set(key, {
      type,
      slug,
      name: decodeHtml(match[3].trim()),
      posterUrl: '',
      description: decodeHtml(match[4].trim())
    });
  }

  for (const match of html.matchAll(GRID_CARD_PATTERN)) {
    const type = match[1] as 'movie' | 'serie';
    const slug = match[2];
    const key = `${type}:${slug}`;
    const existing = items.get(key);
    items.set(key, {
      type,
      slug,
      name: decodeHtml(match[5].trim() || match[4].trim()),
      posterUrl: normalizePosterUrl(match[3]),
      description: existing?.description
    });
  }

  return Array.from(items.values()).filter((item) => item.name && item.posterUrl);
}

export function parseMovieclubDetailsFromHtml(
  html: string,
  item: MovieclubListItem
): Partial<CreateTitleDto> | null {
  const name =
    decodeHtml(html.match(/<h1 class="card-title[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim() ?? '') || item.name;
  const description =
    decodeHtml(html.match(/<div class="fst-italic lh-sm mb-2">([\s\S]*?)<\/div>/i)?.[1]?.trim() ?? '') ||
    decodeHtml(html.match(/itemprop=description content="([^"]+)"/i)?.[1]?.trim() ?? '') ||
    item.description ||
    `${name} imported from HDToday.`;

  const posterUrl =
    normalizePosterUrl(
      html.match(/data-src=(https:\/\/i2\.wp\.com\/image\.tmdb\.org\/t\/p\/w185\/[^ >]+)/i)?.[1] ?? ''
    ) || item.posterUrl;

  const backdropUrl =
    normalizeBackdropUrl(
      html.match(/property="og:image" content="([^"]+)"/i)?.[1] ??
        html.match(/data-src="(https:\/\/i2\.wp\.com\/image\.tmdb\.org\/t\/p\/w780\/[^"]+)"/i)?.[1] ??
        ''
    ) || posterUrl;

  const genres = [...html.matchAll(/<strong>Genre:<\/strong>[\s\S]*?<\/p>/gi)]
    .flatMap((block) => [...block[0].matchAll(/title="([^"]+)"/g)].map((match) => match[1]))
    .filter(Boolean);

  const cast = [...html.matchAll(/<strong>Casts:<\/strong>[\s\S]*?<\/p>/gi)]
    .flatMap((block) => [...block[0].matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1].trim()))
    .filter(Boolean);

  const releaseYear =
    Number.parseInt(html.match(/<strong>Released:<\/strong>\s*(\d{4})/i)?.[1] ?? '', 10) ||
    extractYearFromText(description) ||
    new Date().getFullYear();

  const runtimeMinutes = parseRuntime(html.match(/<strong>Duration:<\/strong>\s*([^<]+)/i)?.[1]);

  if (!name || !posterUrl) {
    return null;
  }

  const type = item.type === 'serie' ? TitleType.SERIES : TitleType.MOVIE;
  const resolvedGenres = genres.length ? genres.slice(0, 4) : [type === TitleType.SERIES ? 'Drama' : 'Action'];
  const moods = extractMoods(resolvedGenres, description);

  return {
    slug: buildSlug(item.type, item.slug, name),
    name,
    description,
    type,
    releaseYear,
    runtimeMinutes: runtimeMinutes ?? (type === TitleType.SERIES ? 45 : 110),
    maturityRating: type === TitleType.SERIES ? 'TV-14' : 'PG-13',
    language: 'English',
    genres: resolvedGenres,
    cast: cast.slice(0, 6),
    moods,
    tags: withProviderTags(buildTags(name, resolvedGenres, description), item.type, item.slug),
    posterUrl,
    backdropUrl,
    videoUrl: parseMovieclubStreamFromHtml(html) ?? SAMPLE_VIDEO_URL
  };
}

export function mapMovieclubListItemToTitle(
  item: MovieclubListItem,
  details?: Partial<CreateTitleDto> | null
): CreateTitleDto | null {
  if (details?.name && details.posterUrl) {
    return details as CreateTitleDto;
  }

  if (!item.name || !item.posterUrl) {
    return null;
  }

  const type = item.type === 'serie' ? TitleType.SERIES : TitleType.MOVIE;
  const description = item.description ?? `${item.name} imported from HDToday.`;
  const genres = [type === TitleType.SERIES ? 'Drama' : 'Action'];

  return {
    slug: buildSlug(item.type, item.slug, item.name),
    name: item.name,
    description,
    type,
    releaseYear: extractYearFromText(description) ?? new Date().getFullYear(),
    runtimeMinutes: type === TitleType.SERIES ? 45 : 110,
    maturityRating: type === TitleType.SERIES ? 'TV-14' : 'PG-13',
    language: 'English',
    genres,
    cast: [],
    moods: extractMoods(genres, description),
    tags: withProviderTags(buildTags(item.name, genres, description), item.type, item.slug),
    posterUrl: item.posterUrl,
    backdropUrl: normalizeBackdropUrl(item.posterUrl),
    videoUrl: SAMPLE_VIDEO_URL
  };
}

export function parseMovieclubStreamFromHtml(html: string) {
  const sources = [...html.matchAll(/<source src="([^"]+)" type="video\/mp4" label="(\d+)p"/gi)];
  if (sources.length > 0) {
    const best = sources.sort((a, b) => Number.parseInt(b[2], 10) - Number.parseInt(a[2], 10))[0];
    return decodeHtml(best[1]);
  }

  const fallback = html.match(/<source src="([^"]+\.mp4[^"]*)"/i)?.[1];
  return fallback ? decodeHtml(fallback) : null;
}

export function providerTag(type: 'movie' | 'serie', slug: string) {
  return `provider:${type}/${slug}`;
}

export function parseMovieclubProviderRef(titleSlug: string, tags: string[] = []) {
  const tag = tags.find((entry) => entry.startsWith('provider:'));
  if (tag) {
    const ref = tag.slice('provider:'.length);
    const slash = ref.indexOf('/');
    if (slash > 0) {
      return {
        type: ref.slice(0, slash) as 'movie' | 'serie',
        slug: ref.slice(slash + 1)
      };
    }
  }

  const match = titleSlug.match(/^hdtoday-(movie|serie)--(.+)$/);
  if (match) {
    return {
      type: match[1] as 'movie' | 'serie',
      slug: match[2]
    };
  }

  return null;
}

export function buildSlug(type: 'movie' | 'serie', providerSlug: string, name: string) {
  const prefix = type === 'serie' ? 'serie' : 'movie';
  const slug = providerSlug || slugify(name);
  return `hdtoday-${prefix}--${slug}`.slice(0, 120);
}

function withProviderTags(tags: string[], type: 'movie' | 'serie', slug: string) {
  return Array.from(new Set([providerTag(type, slug), ...tags]));
}

export function normalizePosterUrl(value: string) {
  if (!value) return '';
  const cleaned = value.replace(/^data-src=/, '').replace(/["']/g, '');
  const base = cleaned.split('?')[0];
  return base.replace('/t/p/w185/', '/t/p/w500/');
}

export function normalizeBackdropUrl(value: string) {
  if (!value) return '';
  const base = value.split('?')[0];
  if (base.includes('/t/p/w185/')) {
    return base.replace('/t/p/w185/', '/t/p/w1280/');
  }
  if (base.includes('/t/p/w780/')) {
    return base.replace('/t/p/w780/', '/t/p/w1280/');
  }
  return base;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractYearFromText(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

function parseRuntime(value: string | undefined) {
  if (!value) return undefined;
  const hourMatch = value.match(/(\d+)\s*h/i);
  const minuteMatch = value.match(/(\d+)\s*m/i);
  const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
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
