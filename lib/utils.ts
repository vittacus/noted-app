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

export function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T12:00:00");
    const curr = new Date(unique[i] + "T12:00:00");
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-[#4ade80]";   // green
  if (score >= 6) return "text-[#fbbf24]";   // yellow
  if (score >= 4) return "text-[#fb923c]";   // orange
  return "text-[#f87171]";                    // red
}
