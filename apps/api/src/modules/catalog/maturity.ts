const order: Record<string, number> = {
  'TV-Y': 1,
  'TV-Y7': 2,
  G: 2,
  PG: 3,
  'TV-PG': 3,
  'PG-13': 4,
  'TV-14': 4,
  R: 5,
  'TV-MA': 5
};

export function isAllowedByMaturity(titleRating: string, profileRating = 'PG-13') {
  return (order[titleRating] ?? 4) <= (order[profileRating] ?? 4);
}
