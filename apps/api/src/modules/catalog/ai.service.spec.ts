import { AiService } from './ai.service';

describe('AiService', () => {
  const service = new AiService();

  it('scores semantic-style matches across moods, tags, genres, and descriptions', () => {
    const score = service.score('funny space family', {
      name: 'Orbit Kids',
      description: 'Siblings solve space puzzles.',
      aiSummary: 'A bright family adventure.',
      cast: ['Ivy Chen'],
      moods: ['funny', 'family'],
      tags: ['space', 'siblings'],
      genres: [{ name: 'Sci-Fi' }]
    });

    expect(score).toBeGreaterThanOrEqual(3);
  });

  it('creates stable numeric vectors for catalog text', () => {
    expect(service.vectorFor('Midnight Signal')).toHaveLength(12);
    expect(service.vectorFor('Midnight Signal')[0]).toEqual(service.vectorFor('Midnight Signal')[0]);
  });
});
