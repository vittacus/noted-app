import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { calculateStreak } from "@/lib/utils";
import FeedTabs from "@/components/FeedTabs";
import RatingComments from "@/components/RatingComments";
import RecommendedTracks from "@/components/RecommendedTracks";
import ScoreCircle from "@/components/ScoreCircle";

export const dynamic = "force-dynamic";

const STATS_CONFIG = [
  { key: "streak",  icon: "🔥", label: "day streak",  accent: "#fb923c", bg: "rgba(251,146,60,0.07)"  },
  { key: "songs",   icon: "🎵", label: "songs rated", accent: "#4fc3f7", bg: "rgba(79,195,247,0.07)"  },
  { key: "albums",  icon: "📀", label: "albums",      accent: "#a78bfa", bg: "rgba(167,139,250,0.07)" },
  { key: "average", icon: "⭐", label: "avg score",   accent: "#fbbf24", bg: "rgba(251,191,36,0.07)"  },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "everyone" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Stats + seed/filter data for recommendations
  let streak = 0, songsRated = 0, albumsCount = 0;
  let avgScore: string | null = null;
  let seedTrackIds: string[] = [];
  let ratedSpotifyIds: string[] = [];
  let topArtistNames: string[] = [];

  if (user) {
    const [{ data: dates }, { data: albumRows }, { data: allRated }] = await Promise.all([
      supabase.from("ratings").select("listened_at").eq("user_id", user.id),
      supabase.from("ratings").select("song:songs(album_name)").eq("user_id", user.id),
      supabase
        .from("ratings")
        .select("overall_score, song:songs(spotify_id, album_name, artist)")
        .eq("user_id", user.id)
        .order("overall_score", { ascending: false }),
    ]);

    const ratedRows = (allRated ?? []) as any[];
    streak = calculateStreak((dates ?? []).map((r: any) => r.listened_at));
    songsRated = ratedRows.length;
    avgScore = songsRated > 0
      ? (ratedRows.reduce((s, r) => s + r.overall_score, 0) / songsRated).toFixed(1)
      : null;
    const albumNames = new Set((albumRows ?? []).map((r: any) => r.song?.album_name).filter(Boolean));
    albumsCount = albumNames.size;

    seedTrackIds   = ratedRows.slice(0, 3).map((r) => r.song?.spotify_id).filter(Boolean);
    ratedSpotifyIds = ratedRows.map((r) => r.song?.spotify_id).filter(Boolean);
    // Deduplicated artist names from top-rated songs for the fallback
    const seen = new Set<string>();
    topArtistNames = ratedRows
      .map((r) => r.song?.artist?.trim())
      .filter((a: string) => a && !seen.has(a) && seen.add(a))
      .slice(0, 5);
  }

  // Feed
  let feedQuery = supabase
    .from("ratings")
    .select(`
      id, overall_score, vibe, listened_at, notes, genre_tags, best_for_tags,
      user:users(id, username, avatar_url),
      song:songs(id, title, artist, album_art_url, album_name)
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (tab === "mine" && user) feedQuery = feedQuery.eq("user_id", user.id);

  const { data: ratings } = await feedQuery;

  const vibeEmoji: Record<string, string> = { loved: "🔥", liked: "👍", didnt_like: "😐" };

  return (
    <div className="page-enter">
      {/* Hero — logged-out */}
      {!user && (
        <div className="bg-gradient-to-br from-[#1a4e78] to-[#0f3a5c] rounded-3xl p-6 mb-8 text-white shadow-xl shadow-[#050e1a]/50">
          <h1 className="text-3xl font-black tracking-tight mb-1">noted</h1>
          <p className="text-[#93e4f7] text-sm mb-5">Rate and discover music you love</p>
          <div className="flex gap-2">
            <Link href="/auth/signup" className="px-5 py-2.5 bg-white text-[#4fc3f7] font-semibold text-sm rounded-full hover:bg-[#4fc3f7]/5 transition-colors">Get started</Link>
            <Link href="/auth/login" className="px-5 py-2.5 bg-white/10 text-white font-semibold text-sm rounded-full hover:bg-white/30 transition-colors">Sign in</Link>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {user && (
        <>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {STATS_CONFIG.map((s) => {
              const value =
                s.key === "streak"  ? (streak > 0 ? streak : "—") :
                s.key === "songs"   ? (songsRated || "—") :
                s.key === "albums"  ? (albumsCount || "—") :
                (avgScore ?? "—");
              return (
                <div
                  key={s.key}
                  className="shrink-0 rounded-2xl border border-white/5 px-5 py-4 text-center min-w-[88px]"
                  style={{ background: s.bg, borderLeft: `3px solid ${s.accent}` }}
                >
                  <p className="text-xl leading-none mb-2">{s.icon}</p>
                  <p className="text-2xl font-black leading-none tabular-nums" style={{ color: s.accent }}>
                    {value}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
          {/* Divider between stats and feed */}
          <div className="mt-6 mb-5 border-t border-white/5" />
        </>
      )}

      {/* Recommendations — shown once the user has at least 1 rating */}
      {user && songsRated >= 1 && (
        <RecommendedTracks
          seedTrackIds={seedTrackIds}
          ratedSpotifyIds={ratedSpotifyIds}
          topArtistNames={topArtistNames}
        />
      )}

      {/* Feed toggle */}
      <Suspense>
        <FeedTabs isLoggedIn={!!user} />
      </Suspense>

      {/* Empty states */}
      {tab === "mine" && user && (ratings?.length ?? 0) === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎵</p>
          <p className="font-semibold text-slate-300 text-lg">No ratings yet</p>
          <p className="text-slate-600 text-sm mt-1 mb-4">Start building your library</p>
          <Link href="/search" className="inline-block px-5 py-2.5 bg-[#4fc3f7]/50 text-white text-sm font-semibold rounded-full hover:bg-[#3ab0d8] transition-colors">Rate a song →</Link>
        </div>
      )}
      {tab === "everyone" && (ratings?.length ?? 0) === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎵</p>
          <p className="font-semibold text-slate-300 text-lg">No ratings yet</p>
          <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline mt-1 block">Be the first →</Link>
        </div>
      )}

      {/* Rating cards */}
      <div className="space-y-4">
        {ratings?.map((r: any) => (
          <div key={r.id} className="bg-[#1e2d3d] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
            {/* Clickable song area */}
            <Link href={`/song/${r.id}`} className="block">
              {/* User + date */}
              <div className="flex items-center gap-2 px-4 pt-4">
                <div className="w-6 h-6 rounded-full bg-[#4fc3f7]/20 flex items-center justify-center text-[#4fc3f7] font-bold text-xs overflow-hidden shrink-0">
                  {r.user?.avatar_url
                    ? <Image src={r.user.avatar_url} alt={r.user.username} width={24} height={24} className="object-cover" />
                    : (r.user?.username?.[0] ?? "?").toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-400">{r.user?.username ?? "Unknown"}</span>
                <span className="text-xs text-slate-700 ml-auto">
                  {new Date(r.listened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Song row */}
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0 shadow-lg">
                  {r.song?.album_art_url
                    ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="64px" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-slate-100 truncate leading-tight">{r.song?.title}</p>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{r.song?.artist}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-sm">{vibeEmoji[r.vibe] ?? ""}</span>
                    {(r.genre_tags ?? []).slice(0, 1).map((tag: string) => (
                      <span key={tag} className="text-xs bg-white/5 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                    {/* Custom vibe tags (non-preset best_for entries) */}
                    {(r.best_for_tags ?? [])
                      .filter((t: string) => !["Late Night","Workout","Focus","Heartbreak","Hype","Road Trip"].includes(t))
                      .slice(0, 1)
                      .map((tag: string) => (
                        <span key={tag} className="text-xs bg-[#4fc3f7]/10 text-[#4fc3f7] px-2 py-0.5 rounded-full border border-[#4fc3f7]/20">{tag}</span>
                      ))}
                  </div>
                </div>
                <ScoreCircle score={r.overall_score} size={44} />
              </div>

              {/* Notes */}
              {r.notes && (
                <p className="text-xs text-slate-500 italic mx-4 mb-4 line-clamp-2 border-t border-white/5 pt-3 leading-relaxed">
                  &ldquo;{r.notes}&rdquo;
                </p>
              )}
            </Link>

            {/* Comments (Everyone tab only) */}
            {tab === "everyone" && (
              <div className="border-t border-white/5">
                <RatingComments ratingId={r.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
