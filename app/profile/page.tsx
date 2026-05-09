import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";
import TasteRadar, { type TasteItem } from "@/components/TasteRadar";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: ratings }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("ratings")
      .select("*, song:songs(*)")
      .eq("user_id", user.id)
      .order("overall_score", { ascending: false }),
  ]);

  const totalRated = ratings?.length ?? 0;
  const avgScore =
    totalRated > 0
      ? (ratings!.reduce((s, r) => s + r.overall_score, 0) / totalRated).toFixed(1)
      : null;

  // Genre counts
  const genreCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    (r.genre_tags ?? []).forEach((g: string) => { genreCounts[g] = (genreCounts[g] ?? 0) + 1; });
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Dimension averages
  const dimAvg: Record<string, number> = {
    "Replay Value": totalRated > 0 ? ratings!.reduce((s, r) => s + r.replay_value, 0) / totalRated : 0,
    "Lyrics":       totalRated > 0 ? ratings!.reduce((s, r) => s + r.lyrics, 0) / totalRated : 0,
    "Production":   totalRated > 0 ? ratings!.reduce((s, r) => s + r.production, 0) / totalRated : 0,
  };
  const topDim = Object.entries(dimAvg).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Top artist
  const artistCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    const a = r.song?.artist?.trim();
    if (a) artistCounts[a] = (artistCounts[a] ?? 0) + 1;
  });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Albums in progress
  const albumMap = new Map<string, { name: string; artist: string; art: string | null; count: number; albumId: string }>();
  ratings?.forEach((r: any) => {
    const s = r.song;
    if (!s?.spotify_album_id) return;
    if (!albumMap.has(s.spotify_album_id)) {
      albumMap.set(s.spotify_album_id, { name: s.album_name, artist: s.artist, art: s.album_art_url, count: 0, albumId: s.spotify_album_id });
    }
    albumMap.get(s.spotify_album_id)!.count++;
  });
  const albumsInProgress = Array.from(albumMap.values()).slice(0, 6);

  const top5 = ratings?.slice(0, 5) ?? [];

  // TasteRadar data
  const GENRE_EMOJIS: Record<string, string> = {
    Rap:"🎤", "R&B":"🎸", Pop:"⭐", Indie:"🌿", Electronic:"🎛️", Alternative:"🎵",
    Jazz:"🎺", Classical:"🎻", Country:"🤠", Latin:"💃", Afrobeats:"🥁", Soul:"🎶",
    Metal:"🤘", Folk:"🪕", "K-Pop":"🌟", Drill:"🎯", Trap:"🎵", House:"🏠", Ambient:"🌊",
  };
  const GENRE_COLORS = ["#f59e0b","#ec4899","#8b5cf6","#10b981","#06b6d4","#f97316"];
  const VIBE_EMOJIS: Record<string, string> = {
    "Late Night":"🌙", Workout:"💪", Focus:"🧠", Heartbreak:"💔",
    Hype:"🔥", "Road Trip":"🚗", Chill:"🫶", Other:"🎵",
  };
  const VIBE_COLORS = ["#818cf8","#fb923c","#34d399","#f472b6","#fbbf24","#60a5fa"];

  const maxGenreCount = Math.max(...Object.values(genreCounts), 1);
  const genreItems: TasteItem[] = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([g, cnt], i) => ({
      label: g, emoji: GENRE_EMOJIS[g] ?? "🎵",
      value: cnt / maxGenreCount,
      rawPct: Math.round((cnt / totalRated) * 100),
      color: GENRE_COLORS[i % GENRE_COLORS.length],
    }));

  const vibeCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    for (const t of r.best_for_tags ?? []) vibeCounts[t] = (vibeCounts[t] ?? 0) + 1;
  });
  const maxVibeCount = Math.max(...Object.values(vibeCounts), 1);
  const vibeItems: TasteItem[] = Object.entries(vibeCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([v, cnt], i) => ({
      label: v, emoji: VIBE_EMOJIS[v] ?? "🎵",
      value: cnt / maxVibeCount,
      rawPct: Math.round((cnt / totalRated) * 100),
      color: VIBE_COLORS[i % VIBE_COLORS.length],
    }));

  // Generated headline
  const topGenreName  = genreItems[0]?.label ?? "";
  const topGenrePct   = genreItems[0]?.rawPct ?? 0;
  const topVibeName   = vibeItems[0]?.label ?? "";
  const tasteHeadline = totalRated >= 3
    ? topGenreName && topVibeName
      ? `Your music is ${topGenrePct}% ${topGenreName} and you love ${topVibeName} vibes ✨`
      : topGenreName
        ? `You're ${topGenrePct}% into ${topGenreName} right now ✨`
        : `You're building your taste ✨`
    : "";

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="page-enter space-y-4">
      {/* Profile header */}
      <div className="bg-[#1e2d3d] rounded-3xl p-5 border border-white/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4fc3f7] to-[#0f3a5c] flex items-center justify-center text-white text-2xl font-black overflow-hidden">
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.username} width={64} height={64} className="object-cover" />
              : (profile?.username?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{profile?.username}</h1>
            <p className="text-sm text-slate-500">{profile?.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
            <p className="text-2xl font-black text-slate-100">{totalRated}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rated</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
            <p className="text-2xl font-black text-[#4fc3f7]">{avgScore ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">Avg score</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-2xl p-3 text-center">
            <p className="text-base font-black text-slate-100 leading-tight mt-1">{topGenre ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">Top genre</p>
          </div>
        </div>
      </div>

      {/* Taste profile — only shows once you have ≥3 ratings */}
      {totalRated >= 3 && (
        <div className="bg-[#1e2d3d] rounded-3xl p-5 border border-white/5">
          <h2 className="font-bold text-base text-slate-100 mb-4">Your taste</h2>

          {topDim && (
            <div className="mb-5">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">You value most</p>
              <p className="text-sm font-semibold text-slate-200">
                {topDim}{" "}
                <span className="text-slate-500 font-normal">— avg {dimAvg[topDim].toFixed(1)}/10</span>
              </p>
              <div className="flex gap-2 mt-2.5">
                {Object.entries(dimAvg).map(([dim, val]) => (
                  <div key={dim} className="flex-1">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full taste-bar ${dim === topDim ? "bg-[#4fc3f7]/50" : "bg-white/10"}`}
                        style={{ width: `${(val / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 truncate">{dim.split(" ")[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topArtist && (
            <div className="mb-5">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Top artist</p>
              <p className="text-sm font-semibold text-slate-200">
                {topArtist[0]}{" "}
                <span className="text-slate-500 font-normal">— {topArtist[1]} song{topArtist[1] !== 1 ? "s" : ""} rated</span>
              </p>
            </div>
          )}

          {/* Genre / Vibe DNA radar */}
          <TasteRadar
            genreItems={genreItems}
            vibeItems={vibeItems}
            headline={tasteHeadline}
          />
        </div>
      )}

      {/* Albums in progress */}
      {albumsInProgress.length > 0 && (
        <div>
          <h2 className="font-bold text-base text-slate-100 mb-3">Albums in progress</h2>
          <div className="space-y-2">
            {albumsInProgress.map((a) => (
              <Link
                key={a.albumId}
                href={`/album/${a.albumId}`}
                className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block"
              >
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {a.art
                    ? <Image src={a.art} alt={a.name} fill className="object-cover" sizes="40px" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">{a.name}</p>
                  <p className="text-xs text-slate-500 truncate">{a.artist.split(",")[0]}</p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{a.count} rated</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 */}
      {top5.length > 0 && (
        <div>
          <h2 className="font-bold text-base text-slate-100 mb-3">Top rated</h2>
          <div className="space-y-2">
            {top5.map((r: any, i: number) => (
              <Link
                key={r.id}
                href={`/song/${r.id}`}
                className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block"
              >
                <span className="text-lg font-black text-slate-700 w-6 text-center shrink-0">{i + 1}</span>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {r.song?.album_art_url
                    ? <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="40px" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
                  <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
                </div>
                <ScoreCircle score={r.overall_score} size={40} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <form action={handleSignOut}>
        <button
          type="submit"
          className="w-full py-3 rounded-2xl border border-white/10 text-slate-500 text-sm font-semibold hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
