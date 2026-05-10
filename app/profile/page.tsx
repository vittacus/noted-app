import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, Share2, Settings } from "lucide-react";
import ScoreCircle from "@/components/ScoreCircle";
import TasteRadar, { type TasteItem } from "@/components/TasteRadar";
import { calculateStreak, formatCount } from "@/lib/utils";

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

  // Member since
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "recently";

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

  // Top artist
  const artistCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    const a = r.song?.artist?.trim();
    if (a) artistCounts[a] = (artistCounts[a] ?? 0) + 1;
  });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  // Top 5 songs by score
  const top5Songs = ratings?.slice(0, 3) ?? [];

  // Top 5 albums by avg score
  const albumScoreMap = new Map<string, {
    name: string; art: string | null; totalScore: number; count: number; spotifyId: string | null;
  }>();
  ratings?.forEach((r: any) => {
    const key = (r.song?.spotify_album_id && r.song.spotify_album_id.trim())
      ? r.song.spotify_album_id.trim()
      : r.song?.album_name?.trim().toLowerCase() ?? "unknown";
    if (!albumScoreMap.has(key)) {
      albumScoreMap.set(key, {
        name: r.song?.album_name ?? "",
        art: r.song?.album_art_url ?? null,
        totalScore: 0,
        count: 0,
        spotifyId: (r.song?.spotify_album_id && r.song.spotify_album_id.trim()) ? r.song.spotify_album_id.trim() : null,
      });
    }
    const entry = albumScoreMap.get(key)!;
    entry.totalScore += r.overall_score;
    entry.count++;
  });
  const topAlbums = Array.from(albumScoreMap.values())
    .map((a) => ({ ...a, avgScore: Math.round((a.totalScore / a.count) * 10) / 10 }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3);

  // Stats for taste card
  const streak = calculateStreak((ratings ?? []).map((r: any) => r.listened_at));
  const albumNamesSet = new Set((ratings ?? []).map((r: any) => r.song?.album_name?.trim()).filter(Boolean));
  const albumsCount = albumNamesSet.size;

  const STATS = [
    { icon: "🔥", value: streak > 0 ? streak : "—", label: "day streak",  accent: "#fb923c", bg: "rgba(251,146,60,0.07)"  },
    { icon: "🎵", value: totalRated || "—",           label: "songs rated", accent: "#4fc3f7", bg: "rgba(79,195,247,0.07)"  },
    { icon: "📀", value: albumsCount || "—",          label: "albums",      accent: "#a78bfa", bg: "rgba(167,139,250,0.07)" },
    { icon: "⭐", value: avgScore ?? "—",             label: "avg score",   accent: "#fbbf24", bg: "rgba(251,191,36,0.07)"  },
  ] as const;

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

  const topGenrePct = genreItems[0]?.rawPct ?? 0;
  const topGenreName = genreItems[0]?.label ?? "";
  const topVibeName = vibeItems[0]?.label ?? "";
  const tasteHeadline = totalRated >= 3
    ? topGenreName && topVibeName
      ? `Your music is ${topGenrePct}% ${topGenreName} and you love ${topVibeName} vibes ✨`
      : topGenreName ? `You're ${topGenrePct}% into ${topGenreName} right now ✨`
      : `You're building your taste ✨`
    : "";

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="page-enter -mt-2">

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between mb-6">
        <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Menu size={17} className="text-slate-400" />
        </button>
        <p className="font-bold text-base text-slate-100 tracking-tight">{profile?.username}</p>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <Share2 size={15} className="text-slate-400" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <Settings size={15} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── AVATAR + NAME ── */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4fc3f7] to-[#0f3a5c] flex items-center justify-center text-white text-3xl font-black mb-3 overflow-hidden shadow-xl shadow-[#4fc3f7]/20">
          {profile?.avatar_url
            ? <Image src={profile.avatar_url} alt={profile.username} width={80} height={80} className="object-cover" />
            : (profile?.username?.[0] ?? "?").toUpperCase()}
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">{profile?.username}</h1>
        <p className="text-xs text-slate-500 mt-1">Member since {memberSince}</p>
      </div>

      {/* ── STATS PILLS ── */}
      <div className="flex gap-2 mb-8">
        {[
          { label: "Followers", value: formatCount(67_000) },
          { label: "Following", value: formatCount(0) },
          { label: "Avg Rating", value: avgScore ?? "—" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-[#1e2d3d] rounded-2xl py-3 text-center border border-white/5">
            <p className="text-lg font-black text-slate-100 tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TOP SONGS — full-width list rows ── */}
      {top5Songs.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-slate-100">Top Songs</h2>
            <Link href="/library" className="text-xs text-[#4fc3f7] hover:underline">See all →</Link>
          </div>
          <div className="space-y-2">
            {top5Songs.map((r: any, i: number) => (
              <Link key={r.id} href={`/song/${r.id}`}
                className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block">
                <span className="text-sm font-black text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
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

      {/* ── TOP ALBUMS — full-width list rows ── */}
      {topAlbums.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-slate-100">Top Albums</h2>
            {/* Links to Albums tab in Library */}
            <Link href="/library?view=albums" className="text-xs text-[#4fc3f7] hover:underline">See all →</Link>
          </div>
          <div className="space-y-2">
            {topAlbums.map((album, i) => {
              const row = (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm font-black text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {album.art
                      ? <Image src={album.art} alt={album.name} fill className="object-cover" sizes="40px" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-100 truncate">{album.name}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{album.count} track{album.count !== 1 ? "s" : ""} rated</p>
                  </div>
                  <ScoreCircle score={album.avgScore} size={40} />
                </div>
              );
              return album.spotifyId ? (
                <Link key={i} href={`/album/${album.spotifyId}`}
                  className="block bg-[#1e2d3d] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                  {row}
                </Link>
              ) : (
                <div key={i} className="bg-[#1e2d3d] rounded-2xl border border-white/5">{row}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TASTE CARD ── */}
      {totalRated >= 3 && (
        <div className="bg-[#1e2d3d] rounded-3xl p-5 border border-white/5 mb-4">
          <h2 className="font-bold text-base text-slate-100 mb-4">Your taste</h2>

          {/* Stats bar inside taste card */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-6">
            {STATS.map((s) => (
              <div key={s.label} className="shrink-0 rounded-2xl border border-white/5 px-4 py-3 text-center min-w-[74px]"
                style={{ background: s.bg, borderLeft: `3px solid ${s.accent}` }}>
                <p className="text-lg leading-none mb-1.5">{s.icon}</p>
                <p className="text-xl font-black leading-none tabular-nums" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Dimension circles */}
          <div className="mb-6">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-4">Dimension scores</p>
            <div className="flex justify-around items-end">
              {([
                { key: "Replay Value", label: "Replay",     color: "#4fc3f7" },
                { key: "Lyrics",       label: "Lyrics",     color: "#a78bfa" },
                { key: "Production",   label: "Production", color: "#fb923c" },
              ] as const).map(({ key, label, color }) => {
                const val = dimAvg[key] ?? 0;
                const sz = Math.round(72 + (val / 10) * 28);
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width: sz, height: sz, backgroundColor: `${color}22`, border: `3px solid ${color}` }}>
                      <div className="text-center">
                        <p className="font-black leading-none tabular-nums" style={{ fontSize: Math.round(sz * 0.26), color }}>
                          {val.toFixed(1)}
                        </p>
                        <p className="font-semibold leading-none mt-0.5" style={{ fontSize: Math.round(sz * 0.13), color: `${color}aa` }}>
                          /10
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {topArtist && (
            <div className="mb-5">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Top artist</p>
              <p className="text-sm font-semibold text-slate-200">
                {topArtist[0]}{" "}
                <span className="text-slate-500 font-normal">— {topArtist[1]} song{topArtist[1] !== 1 ? "s" : ""} rated</span>
              </p>
            </div>
          )}

          <TasteRadar genreItems={genreItems} vibeItems={vibeItems} headline={tasteHeadline} />
        </div>
      )}

      {/* Sign out */}
      <form action={handleSignOut}>
        <button type="submit"
          className="w-full py-3 rounded-2xl border border-white/10 text-slate-500 text-sm font-semibold hover:bg-white/5 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  );
}
