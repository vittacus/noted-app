import { VibeOption } from "@/types";

export function calculateScore(params: {
  replay_value: number;
  lyrics: number;
  production: number;
  vibe: VibeOption;
}): number {
  const { replay_value, lyrics, production, vibe } = params;
  const base = (replay_value + lyrics + production) / 3;
  const vibeModifier = vibe === "loved" ? 0.5 : vibe === "didnt_like" ? -0.5 : 0;
  return Math.min(10, Math.max(1, Math.round((base + vibeModifier) * 10) / 10));
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

/** Maps a song's genre tags to a Pokemon-card accent color. Returns null for unknown genres. */
export function genreAccentColor(tags: string[]): string | null {
  const tag = (tags?.[0] ?? "").toLowerCase();
  if (tag.includes("pop"))                               return "#3b82f6"; // blue
  if (tag.includes("rap") || tag.includes("hip"))       return "#fbbf24"; // yellow
  if (tag.includes("latin"))                             return "#ec4899"; // pink
  if (tag.includes("r&b") || tag.includes("soul"))      return "#a78bfa"; // purple
  if (tag.includes("indie"))                             return "#4ade80"; // green
  if (tag.includes("electronic") || tag.includes("house") || tag.includes("ambient")) return "#4fc3f7"; // cyan
  if (tag.includes("trap") || tag.includes("drill"))    return "#fb923c"; // orange
  if (tag.includes("alternative") || tag.includes("metal")) return "#f97316";
  if (tag.includes("jazz") || tag.includes("classical") || tag.includes("folk")) return "#f59e0b";
  if (tag.includes("country"))                          return "#84cc16";
  if (tag.includes("afro") || tag.includes("k-pop"))   return "#10b981";
  return null;
}

export function scoreColor(score: number): string {
  if (score >= 8) return "text-[#4ade80]";   // green
  if (score >= 6) return "text-[#fbbf24]";   // yellow
  if (score >= 4) return "text-[#fb923c]";   // orange
  return "text-[#f87171]";                    // red
}
