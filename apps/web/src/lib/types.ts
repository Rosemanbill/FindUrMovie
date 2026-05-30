export type Profile = {
  id: string;
  name: string;
  avatarUrl: string;
  maturityRating: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
};

export type Genre = {
  id: string;
  name: string;
  slug: string;
};

export type Title = {
  id: string;
  slug: string;
  name: string;
  description: string;
  aiSummary: string | null;
  type: 'MOVIE' | 'SERIES';
  releaseYear: number;
  runtimeMinutes: number | null;
  maturityRating: string;
  language: string;
  cast: string[];
  moods: string[];
  tags: string[];
  popularity: number;
  genres: Genre[];
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  videoUrl: string | null;
  progress?: number;
  episodes: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string;
    description: string;
    runtimeMinutes: number;
    videoUrl: string;
  }[];
};

export type HomeResponse = {
  featured: Title | null;
  rows: {
    key: string;
    label: string;
    titles: Title[];
  }[];
};

export type SessionResponse = {
  token: string;
  user: User;
  profiles: Profile[];
};
