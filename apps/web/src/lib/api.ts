import { HomeResponse, Profile, SessionResponse, Title } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  signup: (payload: { email: string; password: string; name?: string; profileName?: string }) =>
    request<SessionResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload: { email: string; password: string }) =>
    request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: (token: string) => request<{ user: SessionResponse['user']; profiles: Profile[] }>('/me', { token }),
  profiles: (token: string) => request<Profile[]>('/profiles', { token }),
  createProfile: (token: string, payload: { name: string; maturityRating?: string }) =>
    request<Profile>('/profiles', { token, method: 'POST', body: JSON.stringify(payload) }),
  homeRows: (token: string, profileId: string) =>
    request<HomeResponse>(`/home/rows?profileId=${encodeURIComponent(profileId)}`, { token }),
  title: (token: string, slug: string) =>
    request<Title>(`/titles/${encodeURIComponent(slug)}`, { token }),
  titleStream: (token: string, slug: string) =>
    request<{
      streamUrl: string;
      posterUrl: string | null;
      source: 'provider' | 'catalog';
      streamType: 'embed' | 'video';
    }>(`/titles/${encodeURIComponent(slug)}/stream`, { token }),
  similar: (token: string, titleId: string, profileId: string) =>
    request<Title[]>(`/titles/${encodeURIComponent(titleId)}/similar?profileId=${encodeURIComponent(profileId)}`, {
      token
    }),
  search: (token: string, profileId: string, query: string) =>
    request<Title[]>(
      `/search?profileId=${encodeURIComponent(profileId)}&q=${encodeURIComponent(query)}`,
      { token }
    ),
  watchlist: (token: string, profileId: string) =>
    request<Title[]>(`/watchlist?profileId=${encodeURIComponent(profileId)}`, { token }),
  addWatchlist: (token: string, profileId: string, titleId: string) =>
    request('/watchlist', {
      token,
      method: 'POST',
      body: JSON.stringify({ profileId, titleId })
    }),
  removeWatchlist: (token: string, profileId: string, titleId: string) =>
    request(`/watchlist/${encodeURIComponent(titleId)}?profileId=${encodeURIComponent(profileId)}`, {
      token,
      method: 'DELETE'
    }),
  progress: (token: string, profileId: string, titleId: string) =>
    request<{ positionSeconds: number; durationSeconds: number; completed: boolean } | null>(
      `/progress/${encodeURIComponent(titleId)}?profileId=${encodeURIComponent(profileId)}`,
      { token }
    ),
  saveProgress: (
    token: string,
    payload: {
      profileId: string;
      titleId: string;
      episodeId?: string;
      positionSeconds: number;
      durationSeconds: number;
      completed?: boolean;
    }
  ) => request('/progress', { token, method: 'POST', body: JSON.stringify(payload) }),
  rate: (token: string, profileId: string, titleId: string, value: 'LIKE' | 'DISLIKE') =>
    request('/ratings', {
      token,
      method: 'POST',
      body: JSON.stringify({ profileId, titleId, value })
    }),
  event: (token: string, payload: { profileId: string; titleId?: string; type: string; metadata?: object }) =>
    request('/events', { token, method: 'POST', body: JSON.stringify(payload) }),
  adminSeed: (token: string) => request('/admin/seed', { token, method: 'POST' }),
  adminImportTmdb: (
    token: string,
    payload: {
      query?: string;
      mediaType?: 'movie' | 'tv' | 'all';
      limit?: number;
    }
  ) => request<{ ok: true; imported: number; titles: Title[] }>('/admin/import/tmdb', {
    token,
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  adminImportHar: (
    token: string,
    payload: {
      filePath?: string;
      limit?: number;
    }
  ) =>
    request<{ ok: true; imported: number; skipped: number; source: string; titles: Title[] }>(
      '/admin/import/har',
      {
        token,
        method: 'POST',
        body: JSON.stringify(payload)
      }
    ),
  adminCreateTitle: (
    token: string,
    payload: {
      slug: string;
      name: string;
      description: string;
      type: 'MOVIE' | 'SERIES';
      releaseYear: number;
      runtimeMinutes?: number;
      maturityRating: string;
      language?: string;
      genres: string[];
      cast: string[];
      moods: string[];
      tags: string[];
      posterUrl: string;
      backdropUrl: string;
      trailerUrl?: string;
      videoUrl: string;
    }
  ) => request<Title>('/admin/titles', { token, method: 'POST', body: JSON.stringify(payload) })
};
