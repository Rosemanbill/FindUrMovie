import { isAllowedByMaturity } from './maturity';

describe('isAllowedByMaturity', () => {
  it('allows content at or below the profile maturity setting', () => {
    expect(isAllowedByMaturity('PG', 'PG-13')).toBe(true);
  });

  it('blocks mature content for younger profiles before recommendation ranking', () => {
    expect(isAllowedByMaturity('TV-MA', 'TV-Y7')).toBe(false);
  });
});
