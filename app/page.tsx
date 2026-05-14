import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { genreAccentColor, displayGenres } from "@/lib/utils";
import FeedTabs from "@/components/FeedTabs";
import RatingComments from "@/components/RatingComments";
import RecommendedTracks from "@/components/RecommendedTracks";
import ScoreCircle from "@/components/ScoreCircle";

export const dynamic = "force-dynamic";

const SUGGESTED_FRIENDS = [
  { username: "beatmaven",   initials: "BM", color: "#f59e0b", match: 94, genre: "Rap / Alt"    },
  { username: "melodyghost", initials: "MG", color: "#ec4899", match: 88, genre: "Latin / Pop"  },
  { username: "wavesurfer",  initials: "WS", color: "#4fa8ff", match: 82, genre: "Indie / R&B"  },
  { username: "lowfreq",     initials: "LF", color: "#a78bfa", match: 79, genre: "Rap / Soul"   },
  { username: "driftpop",    initials: "DP", color: "#4ade80", match: 75, genre: "Pop"           },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "everyone" } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Recommendation seed data (no stats — those live on the Profile page)
  let songsRated = 0;
  let seedTrackIds: string[] = [];
  let ratedSpotifyIds: string[] = [];
  let topArtistNames: string[] = [];

  if (user) {
    const { data: allRated } = await supabase
      .from("ratings")
      .select("overall_score, song:songs(spotify_id, artist)")
      .eq("user_id", user.id)
      .order("overall_score", { ascending: false });

    const ratedRows = (allRated ?? []) as any[];
    songsRated = ratedRows.length;
    seedTrackIds    = ratedRows.slice(0, 3).map((r) => r.song?.spotify_id).filter(Boolean);
    ratedSpotifyIds = ratedRows.map((r) => r.song?.spotify_id).filter(Boolean);
    const seen = new Set<string>();
    topArtistNames  = ratedRows
      .map((r) => r.song?.artist?.trim())
      .filter((a: string) => a && !seen.has(a) && seen.add(a))
      .slice(0, 5);
  }

  // Feed query
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
        <div className="-mx-4 mb-10">
          <div className="min-h-[42vh] flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#0D0D0D] via-[#0D0D0D] to-[#0D0D0D] px-6 py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(79,195,247,0.12),transparent)] pointer-events-none" />
            <div className="relative">
              <h1 className="text-6xl font-black tracking-tighter text-[#4fa8ff] mb-4 leading-none">noted</h1>
              <p className="text-xl font-semibold text-white mb-2">Rate and discover the music you love</p>
              <p className="text-sm text-white/50 mb-8 max-w-xs mx-auto leading-relaxed">
                Track every song. Build your taste. Find your top 100.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/auth/signup" className="px-7 py-3.5 bg-[#4fa8ff] text-[#0D0D0D] font-bold text-sm rounded-2xl hover:bg-[#90c5ff] transition-colors shadow-lg shadow-[#4fa8ff]/25">
                  Get started
                </Link>
                <Link href="/auth/login" className="px-7 py-3.5 border-2 border-white/12 text-white font-bold text-sm rounded-2xl hover:bg-white/8 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
          <div className="text-center py-5 bg-[#1A1A1A]/60 border-y border-white/8">
            <p className="text-xs text-white/50">
              Join to rate songs →{" "}
              <Link href="/auth/signup" className="text-[#4fa8ff] font-semibold hover:underline">Create a free account</Link>
            </p>
          </div>
        </div>
      )}

      {/* Recommended for you */}
      {user && songsRated >= 1 && (
        <RecommendedTracks
          seedTrackIds={seedTrackIds}
          ratedSpotifyIds={ratedSpotifyIds}
          topArtistNames={topArtistNames}
        />
      )}

      {/* Suggested friends */}
      {user && (
        <div className="mb-8">
          <div className="mb-3">
            <h2 className="font-bold text-base text-slate-100">Suggested friends</h2>
            <p className="text-xs text-white/38 mt-0.5">People with similar taste</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {SUGGESTED_FRIENDS.map((f) => (
              <div key={f.username}
                className="shrink-0 w-32 bg-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center gap-2"
                style={{ border: `1px solid ${f.color}35` }}>
                {/* Avatar with gradient ring in their color */}
                <div className="rounded-full p-[1.5px]"
                  style={{ background: `linear-gradient(135deg, ${f.color}, transparent)` }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white bg-[#1A1A1A]"
                    style={{ backgroundColor: `${f.color}20` }}>
                    {f.initials}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-200 truncate w-full text-center">{f.username}</p>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-xs font-bold" style={{ color: f.color }}>{f.match}% match</p>
                  <p className="text-xs text-white/38 text-center leading-tight">{f.genre}</p>
                </div>
                <button disabled className="w-full py-1 rounded-lg border border-white/10 text-xs text-white/38 cursor-not-allowed">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
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
          <Link href="/search" className="inline-block mt-4 px-5 py-2.5 bg-[#4fa8ff]/50 text-white text-sm font-semibold rounded-full hover:bg-[#3a90f0] transition-colors">
            Rate a song →
          </Link>
        </div>
      )}
      {tab === "everyone" && (ratings?.length ?? 0) === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎵</p>
          <p className="font-semibold text-slate-300 text-lg">No ratings yet</p>
          <Link href="/search" className="text-[#4fa8ff] text-sm font-semibold hover:underline mt-1 block">Be the first →</Link>
        </div>
      )}

      {/* Rating cards */}
      <div className="space-y-4">
        {ratings?.map((r: any) => {
          const accentColor = genreAccentColor(r.genre_tags ?? []);
          return (
            <div key={r.id} className="bg-[#1A1A1A] rounded-2xl border border-white/8 overflow-hidden hover:border-white/10 transition-colors">
              {/* Pokemon accent bar */}
              {accentColor && (
                <div className="flex justify-center pt-2">
                  <div className="h-[3px] rounded-full" style={{ width: "60%", background: `linear-gradient(to right, ${accentColor}, transparent)` }} />
                </div>
              )}

              <Link href={`/song/${r.id}`} className="block">
                {/* User + date */}
                <div className={`flex items-center gap-2 px-4 ${accentColor ? "pt-2" : "pt-4"}`}>
                  <div className="w-6 h-6 rounded-full bg-[#4fa8ff]/20 flex items-center justify-center text-[#4fa8ff] font-bold text-xs overflow-hidden shrink-0">
                    {r.user?.avatar_url
                      ? <Image src={r.user.avatar_url} alt={r.user.username} width={24} height={24} className="object-cover" />
                      : (r.user?.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white/50">{r.user?.username ?? "Unknown"}</span>
                  <span className="text-xs text-white/28 ml-auto">
                    {new Date(r.listened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Song row */}
                <div className="flex items-center gap-4 px-4 py-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0 shadow-lg">
                    {r.song?.album_art_url
                      ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="64px" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-slate-100 truncate leading-tight">{r.song?.title}</p>
                    <p className="text-sm text-white/50 truncate mt-0.5">{r.song?.artist}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-sm">{vibeEmoji[r.vibe] ?? ""}</span>
                      {displayGenres(r.genre_tags ?? []).map((tag: string) => (
                        <span key={tag} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {(r.best_for_tags ?? [])
                        .filter((t: string) => !["Late Night","Workout","Focus","Heartbreak","Hype","Road Trip","Chill","Other"].includes(t))
                        .slice(0, 1)
                        .map((tag: string) => (
                          <span key={tag} className="text-xs bg-[#4fa8ff]/10 text-[#4fa8ff] px-2 py-0.5 rounded-full border border-[#4fa8ff]/20">{tag}</span>
                        ))}
                    </div>
                  </div>
                  <ScoreCircle score={r.overall_score} size={40} />
                </div>

                {r.notes && (
                  <p className="text-xs text-white/50 italic mx-4 mb-4 line-clamp-2 border-t border-white/8 pt-3 leading-relaxed">
                    &ldquo;{r.notes}&rdquo;
                  </p>
                )}
              </Link>

              {tab === "everyone" && (
                <div className="border-t border-white/8">
                  <RatingComments ratingId={r.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
