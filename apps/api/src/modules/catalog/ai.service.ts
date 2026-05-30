import { Injectable } from '@nestjs/common';

type SearchableTitle = {
  name: string;
  description: string;
  aiSummary: string | null;
  cast: string[];
  moods: string[];
  tags: string[];
  genres?: { name: string }[];
};

@Injectable()
export class AiService {
  score(query: string, title: SearchableTitle) {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
    const haystack = [
      title.name,
      title.description,
      title.aiSummary ?? '',
      ...title.cast,
      ...title.moods,
      ...title.tags,
      ...(title.genres?.map((genre) => genre.name) ?? [])
    ]
      .join(' ')
      .toLowerCase();

    return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
  }

  generateSummary(input: SearchableTitle) {
    const primaryMood = input.moods[0] ?? 'cinematic';
    const primaryGenre = input.genres?.[0]?.name ?? input.tags[0] ?? 'story';
    return `${input.name} is a ${primaryMood} ${primaryGenre.toLowerCase()} pick for viewers who want ${input.tags.slice(0, 2).join(' and ') || 'a fresh watch'}.`;
  }

  vectorFor(text: string) {
    const buckets = Array.from({ length: 12 }, () => 0);
    for (const [index, char] of Array.from(text.toLowerCase()).entries()) {
      buckets[index % buckets.length] += char.charCodeAt(0) / 255;
    }
    return buckets.map((value) => Number(value.toFixed(4)));
  }
}
