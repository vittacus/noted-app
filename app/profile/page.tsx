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

  // Top artist — credit all collaborators via artist_names array when available
  const artistCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    // Prefer artist_names (multi-artist array) saved since the collab fix,
    // fall back to splitting song.artist string for older ratings
    // Use stored artist_names array (supports multi-artist) when available.
    // For older ratings without artist_names, treat song.artist as ONE name —
    // never split on commas because artist names can contain commas ("Tyler, The Creator").
    const names: string[] =
      (r.artist_names as string[] | undefined)?.length
        ? (r.artist_names as string[])
        : r.song?.artist ? [r.song.artist.trim()] : [];
    for (const a of names) {
      artistCounts[a] = (artistCounts[a] ?? 0) + 1;
    }
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
    { icon: "🎵", value: totalRated || "—",           label: "songs rated", accent: "#4fa8ff", bg: "rgba(79,195,247,0.07)"  },
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
  const tasteHeadline = (() => {
    if (totalRated < 3) return "";
    const avgNum = avgScore ? parseFloat(avgScore) : null;
    const g0 = genreItems[0]; const g1 = genreItems[1];
    const v0 = vibeItems[0];  const v1 = vibeItems[1];
    const replayAvg = dimAvg["Replay Value"] ?? 0;
    const lyricsAvg = dimAvg["Lyrics"] ?? 0;
    const prodAvg   = dimAvg["Production"] ?? 0;
    const topDimEntry = Object.entries(dimAvg).sort((a, b) => b[1] - a[1])[0];
    const topDim = topDimEntry?.[0] ?? "";
    const topDimReadable = topDim === "Replay Value" ? "replay" : topDim.toLowerCase();
    const artistName  = topArtist?.[0];
    const artistCount = topArtist?.[1] ?? 0;

    const lines: string[] = [];

    if (g0 && v0)
      lines.push(`Your music is ${g0.rawPct}% ${g0.label} and you love ${v0.label} vibes ✨`);
    if (g0 && g1)
      lines.push(`A ${g0.label} head at heart with a soft spot for ${g1.label} 🎵`);
    if (artistName && artistCount >= 2)
      lines.push(`${artistName} has your soul right now — ${artistCount} songs deep 🔥`);
    if (avgNum && totalRated >= 5)
      lines.push(`You rate harder than most. ${avgScore}/10 average puts you in rare company 👀`);
    if (topDim && totalRated >= 3)
      lines.push(`Your ${topDimReadable} scores are elite. You know what sounds good 🎧`);
    if (totalRated >= 10)
      lines.push(`${totalRated} songs rated and still going. The library doesn't stop 📚`);
    if (v0 && v1)
      lines.push(`Mostly ${v0.label} energy but ${v1.label} sneaks in when you need it 🌙`);
    if (artistName)
      lines.push(`If your taste was a playlist it'd start with ${artistName} and never stop 🎤`);
    if (streak >= 3)
      lines.push(`${streak} day streak. The ears don't rest 🔥`);
    if (prodAvg >= 6 && totalRated >= 3)
      lines.push(`Your production scores average ${prodAvg.toFixed(1)}. You hear things others miss 🎹`);
    if (v0)
      lines.push(`The ${v0.label} mood list is getting long. You know the assignment 🌃`);
    if (replayAvg >= 7)
      lines.push(`Replay value is your north star — you don't rate songs you won't come back to 🎵`);
    if (g0 && g1)
      lines.push(`${g0.label} by day, ${g1.label} by night — it's giving versatile 🎶`);
    if (g0 && g0.rawPct >= 30)
      lines.push(`${g0.rawPct}% ${g0.label}. At this point it's a lifestyle 🎤`);
    if (totalRated >= 20)
      lines.push(`${totalRated} songs in. The collection speaks for itself 📀`);
    if (avgNum && avgNum >= 7)
      lines.push(`Low scores are rare for you — you know what you like and you stick to it 👌`);
    if (artistName)
      lines.push(`Most played: ${artistName}. Respectable taste 🎵`);
    if (lyricsAvg >= 7)
      lines.push(`Your lyrics scores run high. The words hit different 📝`);
    if (totalRated >= 5)
      lines.push(`${totalRated} ratings and counting. Still no signs of stopping 🔥`);
    if (g0)
      lines.push(`The ${g0.label} era is in full effect — ${g0.rawPct}% of your library agrees ✨`);
    if (avgNum)
      lines.push(`You don't just listen. You rate. Your ${avgScore}/10 average shows it 🎧`);
    if (streak >= 7)
      lines.push(`${streak} days in a row. The dedication is real 🔥`);
    if (g0 && g1)
      lines.push(`If ${g0.label} ever fails you, ${g1.label} is always there as backup 🎵`);
    if (artistName && artistCount >= 3)
      lines.push(`${artistName} — ${artistCount} songs rated and it's not slowing down 🎤`);
    if (replayAvg >= 5 && totalRated >= 3)
      lines.push(`A ${replayAvg.toFixed(1)} replay score says you don't rate songs you won't return to 🔁`);
    if (avgNum && totalRated >= 3)
      lines.push(`${avgScore}/10 across ${totalRated} songs. The taste is consistent 🎶`);

    if (lines.length === 0) {
      return g0 ? `You're ${g0.rawPct}% into ${g0.label} right now ✨` : "You're building your taste ✨";
    }
    return lines[Math.floor(Math.random() * lines.length)];
  })();

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
          <Menu size={17} className="text-white/50" />
        </button>
        <p className="font-bold text-base text-slate-100 tracking-tight">{profile?.username}</p>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors">
            <Share2 size={15} className="text-white/50" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors">
            <Settings size={15} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* ── AVATAR + NAME ── */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4fa8ff] to-[#1A1A1A] flex items-center justify-center text-white text-3xl font-black mb-3 overflow-hidden shadow-xl shadow-[#4fa8ff]/20">
          {profile?.avatar_url
            ? <Image src={profile.avatar_url} alt={profile.username} width={80} height={80} className="object-cover" />
            : (profile?.username?.[0] ?? "?").toUpperCase()}
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">{profile?.username}</h1>
        <p className="text-xs text-white/50 mt-1">Member since {memberSince}</p>
      </div>

      {/* ── STATS PILLS ── */}
      <div className="flex gap-2 mb-8">
        {[
          { label: "Followers", value: formatCount(67_000) },
          { label: "Following", value: formatCount(0) },
          { label: "Avg Rating", value: avgScore ?? "—" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-[#1A1A1A] rounded-2xl py-3 text-center border border-white/8">
            <p className="text-lg font-black text-slate-100 tabular-nums">{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TOP SONGS — full-width list rows ── */}
      {top5Songs.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-slate-100">Top Songs</h2>
            <Link href="/library" className="text-xs text-[#4fa8ff] hover:underline">See all →</Link>
          </div>
          <div className="space-y-2">
            {top5Songs.map((r: any, i: number) => (
              <Link key={r.id} href={`/song/${r.id}`}
                className="flex items-center gap-3 bg-[#1A1A1A] rounded-2xl p-3 border border-white/8 hover:border-white/10 transition-colors block">
                <span className="text-sm font-black text-white/38 w-5 text-right shrink-0">{i + 1}</span>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {r.song?.album_art_url
                    ? <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="40px" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
                  <p className="text-xs text-white/50 truncate">{r.song?.artist}</p>
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
            <Link href="/library?view=albums" className="text-xs text-[#4fa8ff] hover:underline">See all →</Link>
          </div>
          <div className="space-y-2">
            {topAlbums.map((album, i) => {
              const row = (
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm font-black text-white/38 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {album.art
                      ? <Image src={album.art} alt={album.name} fill className="object-cover" sizes="40px" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-100 truncate">{album.name}</p>
                    <p className="text-xs text-white/38 mt-0.5">{album.count} track{album.count !== 1 ? "s" : ""} rated</p>
                  </div>
                  <ScoreCircle score={album.avgScore} size={40} />
                </div>
              );
              return album.spotifyId ? (
                <Link key={i} href={`/album/${album.spotifyId}`}
                  className="block bg-[#1A1A1A] rounded-2xl border border-white/8 hover:border-white/10 transition-colors">
                  {row}
                </Link>
              ) : (
                <div key={i} className="bg-[#1A1A1A] rounded-2xl border border-white/8">{row}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TASTE CARD ── */}
      {totalRated >= 3 && (
        <div className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/8 mb-4">
          <h2 className="font-bold text-base text-slate-100 mb-4">Your taste</h2>

          {/* Stats bar inside taste card */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-6">
            {STATS.map((s) => (
              <div key={s.label} className="shrink-0 rounded-2xl border border-white/8 px-4 py-3 text-center min-w-[74px]"
                style={{ background: s.bg, borderLeft: `3px solid ${s.accent}` }}>
                <p className="text-lg leading-none mb-1.5">{s.icon}</p>
                <p className="text-xl font-black leading-none tabular-nums" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-[10px] text-white/50 mt-1.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Dimension circles */}
          <div className="mb-6">
            <p className="text-xs text-white/38 uppercase tracking-wide font-semibold mb-4">Dimension scores</p>
            <div className="flex justify-around items-end">
              {([
                { key: "Replay Value", label: "Replay",     color: "#4fa8ff" },
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
                    <p className="text-xs font-semibold text-white/50">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {topArtist && (
            <div className="mb-5">
              <p className="text-xs text-white/38 uppercase tracking-wide font-semibold mb-1">Top artist</p>
              <p className="text-sm font-semibold text-slate-200">
                {topArtist[0]}{" "}
                <span className="text-white/50 font-normal">— {topArtist[1]} song{topArtist[1] !== 1 ? "s" : ""} rated</span>
              </p>
            </div>
          )}

          <TasteRadar genreItems={genreItems} vibeItems={vibeItems} headline={tasteHeadline} />
        </div>
      )}

      {/* Sign out */}
      <form action={handleSignOut}>
        <button type="submit"
          className="w-full py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/5 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  );
}
