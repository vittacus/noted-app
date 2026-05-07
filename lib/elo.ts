export const K_FACTOR = 32;

/** Initial ELO when a song is first rated: base 1000 + dimension avg × 100 */
export function initialElo(avgDimension: number): number {
  return Math.round(1000 + avgDimension * 100);
}

/** What users see — ELO divided by 200, capped 1.0–10.0, 1 decimal */
export function eloToDisplayScore(elo: number): number {
  return Math.min(10, Math.max(1, Math.round((elo / 200) * 10) / 10));
}

/** P(A beats B) per standard ELO formula */
export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/** Compute new ELO values after a head-to-head result */
export function updateElo(
  winnerElo: number,
  loserElo: number,
  k = K_FACTOR
): { winner: number; loser: number } {
  const expW = expectedScore(winnerElo, loserElo);
  const expL = expectedScore(loserElo, winnerElo);
  return {
    winner: Math.round(winnerElo + k * (1 - expW)),
    loser:  Math.round(loserElo  + k * (0 - expL)),
  };
}

/** Derive ELO from a rating — handles legacy rows that predate the elo_score column */
export function ratingElo(r: { elo_score?: number | null; overall_score: number }): number {
  return r.elo_score ?? Math.round(r.overall_score * 200);
}
