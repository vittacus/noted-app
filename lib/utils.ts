import { VibeOption } from "@/types";

export function calculateScore(params: {
  replay_value: number;
  lyrics: number;
  production: number;
  vibe: VibeOption;
  comparisonWon: boolean | null;
}): number {
  const { replay_value, lyrics, production, vibe, comparisonWon } = params;
  const base = (replay_value + lyrics + production) / 3;

  let vibeModifier = 0;
  if (vibe === "loved") vibeModifier = 0.5;
  else if (vibe === "didnt_like") vibeModifier = -0.5;

  let comparisonModifier = 0;
  if (comparisonWon === true) comparisonModifier = 0.2;
  else if (comparisonWon === false) comparisonModifier = -0.2;

  const raw = base + vibeModifier + comparisonModifier;
  return Math.min(10, Math.max(1, Math.round(raw * 10) / 10));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function vibeLabel(vibe: VibeOption): string {
  if (vibe === "loved") return "Loved it";
  if (vibe === "liked") return "Liked it";
  return "Didn't like it";
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-sky-500";
  if (score >= 4) return "text-amber-500";
  return "text-rose-500";
}
