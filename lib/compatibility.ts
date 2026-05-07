export interface UserTasteProfile {
  genres: Record<string, number>;   // genre tag → rating count
  avgScore: number;                  // mean overall_score
  artists: Record<string, number>;  // artist name → rating count
}

/**
 * Returns a 0–100 compatibility percentage between two users' taste profiles.
 *
 * Breakdown:
 *   40% — genre overlap (Jaccard-weighted across shared tags)
 *   30% — score palette similarity (how close their average ratings are)
 *   30% — artist overlap (proportion of shared top artists)
 *
 * Not yet surfaced in the UI — built for V2 social features.
 */
export function calculateCompatibility(a: UserTasteProfile, b: UserTasteProfile): number {
  // Genre overlap (0–40)
  const allGenres = new Set([...Object.keys(a.genres), ...Object.keys(b.genres)]);
  let genreSum = 0;
  for (const g of allGenres) {
    const ac = a.genres[g] ?? 0;
    const bc = b.genres[g] ?? 0;
    if (ac > 0 && bc > 0) {
      genreSum += Math.min(ac, bc) / Math.max(ac, bc);
    }
  }
  const genreScore = allGenres.size > 0 ? (genreSum / allGenres.size) * 40 : 0;

  // Score similarity (0–30): full 30 pts when averages match, 0 pts when 5+ apart
  const scoreDiff = Math.abs(a.avgScore - b.avgScore);
  const scoreScore = Math.max(0, 1 - scoreDiff / 5) * 30;

  // Artist overlap (0–30): fraction of artists both have rated
  const allArtists = new Set([...Object.keys(a.artists), ...Object.keys(b.artists)]);
  let sharedArtists = 0;
  for (const ar of allArtists) {
    if ((a.artists[ar] ?? 0) > 0 && (b.artists[ar] ?? 0) > 0) sharedArtists++;
  }
  const artistScore = allArtists.size > 0 ? (sharedArtists / allArtists.size) * 30 : 0;

  return Math.round(genreScore + scoreScore + artistScore);
}

/** Build a taste profile from raw Supabase ratings rows */
export function buildTasteProfile(ratings: any[]): UserTasteProfile {
  const genres: Record<string, number> = {};
  const artists: Record<string, number> = {};
  let scoreSum = 0;

  for (const r of ratings) {
    scoreSum += r.overall_score ?? 0;
    for (const g of r.genre_tags ?? []) {
      genres[g] = (genres[g] ?? 0) + 1;
    }
    const artist = r.song?.artist?.trim();
    if (artist) artists[artist] = (artists[artist] ?? 0) + 1;
  }

  return {
    genres,
    artists,
    avgScore: ratings.length > 0 ? scoreSum / ratings.length : 0,
  };
}
