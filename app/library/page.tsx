"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Music2, LayoutGrid, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Rating, Song } from "@/types";
import { formatDuration, genreAccentColor, displayGenres } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import { SpotifyTrack } from "@/types";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";

type SortKey = "score" | "date" | "artist";
type ViewMode = "list" | "grid";
type LibraryMode = "songs" | "albums";

interface RatingWithSong extends Rating { song: Song; }

interface AlbumGroup {
  key: string;
  albumName: string;
  artist: string;
  albumArt: string | null;
  spotifyAlbumId: string | null;
  songs: RatingWithSong[];
  avgScore: number;
}

export default function LibraryPage() {
  const supabase = createClient();
  const router = useRouter();

  // Async album tap: uses stored Spotify ID directly, or looks it up via search API
  async function handleAlbumTap(a: AlbumGroup) {
    console.log("[library/albums] tap — spotifyAlbumId:", a.spotifyAlbumId, "| albumName:", a.albumName);
    if (a.spotifyAlbumId) {
      router.push(`/album/${a.spotifyAlbumId}`);
      return;
    }
    // No stored ID — search Spotify by album name + artist to get the real ID
    try {
      const q = encodeURIComponent(`${a.albumName} ${a.artist}`);
      const res = await fetch(`/api/spotify/search?q=${q}&type=album`);
      const data = await res.json();
      const found = data.albums?.items?.[0]?.id;
      console.log("[library/albums] Spotify lookup result:", found);
      if (found) {
        router.push(`/album/${found}`);
      } else {
        console.warn("[library/albums] album not found on Spotify:", a.albumName);
      }
    } catch (err) {
      console.error("[library/albums] lookup failed:", err);
    }
  }

  const [ratings, setRatings] = useState<RatingWithSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // per-key default: score↓, artist↑, date↓
  const [genre, setGenre] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [libraryMode, setLibraryMode] = useState<LibraryMode>("songs");

  // Read ?view=albums from URL on mount (used by profile "See all" links)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "albums") setLibraryMode("albums");
    }
  }, []);
  const [genres, setGenres] = useState<string[]>([]);
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);
  // Spotify total track counts keyed by spotify_album_id
  const [albumTotals, setAlbumTotals] = useState<Map<string, number>>(new Map());
  const [albumTotalsLoaded, setAlbumTotalsLoaded] = useState(false);
  // Correct artist names from Spotify (fixes "Tyler" → "Tyler, The Creator")
  const [albumArtists, setAlbumArtists] = useState<Map<string, string>>(new Map());

  // Album tab sort / filter state
  type AlbumSortKey = "score" | "artist" | "date";
  const [albumSort, setAlbumSort] = useState<AlbumSortKey>("score");
  const [albumSortDir, setAlbumSortDir] = useState<"asc" | "desc">("desc");
  const [albumGenre, setAlbumGenre] = useState<string>("all");
  const [albumStatus, setAlbumStatus] = useState<"all" | "complete">("all");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("ratings")
        .select("*, song:songs(*)")
        .eq("user_id", user.id);
      if (data) {
        setRatings(data as RatingWithSong[]);
        setGenres(Array.from(new Set(data.flatMap((r: any) => r.genre_tags ?? []))));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Group ratings by album — robust deduplication
  const albumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, AlbumGroup>();
    for (const r of ratings) {
      const sid = (r.song as any).spotify_album_id as string | null | undefined;
      // Primary: use spotify_album_id; fallback: album_name (normalised, drop track-artist since it varies)
      const key = (sid && sid.trim())
        ? sid.trim()
        : r.song.album_name.trim().toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          albumName: r.song.album_name,
          artist: r.song.artist,
          albumArt: r.song.album_art_url,
          spotifyAlbumId: (sid && sid.trim()) ? sid.trim() : null,
          songs: [],
          avgScore: 0,
        });
      }
      map.get(key)!.songs.push(r);
    }
    for (const g of map.values()) {
      g.avgScore = Math.round(
        (g.songs.reduce((s, r) => s + r.overall_score, 0) / g.songs.length) * 10
      ) / 10;
    }
    return Array.from(map.values()).sort((a, b) => b.avgScore - a.avgScore);
  }, [ratings]);

  // Fetch Spotify total track counts for all known album IDs
  useEffect(() => {
    const ids = albumGroups.map((a) => a.spotifyAlbumId).filter(Boolean) as string[];
    if (!ids.length) return;

    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));

    Promise.all(
      batches.map((batch) =>
        fetch(`/api/spotify/albums?ids=${batch.join(",")}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const totals = new Map<string, number>();
      const artists = new Map<string, string>();
      for (const result of results) {
        for (const album of (result?.albums ?? [])) {
          if (album?.id) {
            totals.set(album.id, album.total_tracks ?? 0);
            // Use Spotify's album artist name — fixes "Tyler" → "Tyler, The Creator"
            const artistName = album.artists?.[0]?.name;
            if (artistName) artists.set(album.id, artistName);
          }
        }
      }
      setAlbumTotals(totals);
      setAlbumArtists(artists);
      setAlbumTotalsLoaded(true);
    });
  }, [albumGroups]);

  const filtered = ratings
    .filter((r) => genre === "all" || (r.genre_tags ?? []).includes(genre))
    .sort((a, b) => {
      const dir = sortDir === "desc" ? 1 : -1;
      if (sort === "score")  return dir * (b.overall_score - a.overall_score);
      if (sort === "artist") return dir * a.song.artist.localeCompare(b.song.artist);
      return dir * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

  function openReRate(r: RatingWithSong) {
    setRatingTrack({
      id: r.song.spotify_id,
      name: r.song.title,
      artists: [{ name: r.song.artist }],
      album: {
        id: (r.song as any).spotify_album_id ?? "",
        name: r.song.album_name,
        images: r.song.album_art_url ? [{ url: r.song.album_art_url }] : [],
        release_date: "",
      },
      duration_ms: r.song.duration_seconds * 1000,
    });
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl text-slate-100">Library</h1>
        <div className="flex gap-2 items-center">
          {/* Battle mode icon button */}
          <Link href="/battle"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors"
            title="Battle mode">
            <Swords size={15} className="text-white/50" />
          </Link>
          {/* List/grid toggle — songs mode only */}
          {libraryMode === "songs" && (
            <button onClick={() => setView(view === "list" ? "grid" : "list")}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors"
              title={view === "list" ? "Grid view" : "List view"}>
              {view === "list" ? <LayoutGrid size={16} className="text-white/50" /> : <Music2 size={16} className="text-white/50" />}
            </button>
          )}
        </div>
      </div>

      {/* Songs / Albums toggle */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-5">
        {(["songs", "albums"] as LibraryMode[]).map((m) => (
          <button key={m} onClick={() => setLibraryMode(m)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all capitalize ${
              libraryMode === m
                ? "text-white bg-gradient-accent shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}>
            {m} {m === "songs" ? `(${ratings.length})` : `(${albumGroups.length})`}
          </button>
        ))}
      </div>

      {/* ── ALBUMS VIEW ── */}
      {libraryMode === "albums" && (() => {
        // All genre tags across all album songs (for the genre filter pills)
        const albumAllGenres = [...new Set(
          albumGroups.flatMap((a) => a.songs.flatMap((s: any) => s.genre_tags ?? []))
        )].sort();

        // Apply sort + filters
        const sortedAlbums = albumGroups.slice().sort((a, b) => {
          const dir = albumSortDir === "desc" ? 1 : -1;
          if (albumSort === "score")  return dir * (b.avgScore - a.avgScore);
          if (albumSort === "artist") {
            const na = (a.spotifyAlbumId && albumArtists.get(a.spotifyAlbumId)) ?? a.artist;
            const nb = (b.spotifyAlbumId && albumArtists.get(b.spotifyAlbumId)) ?? b.artist;
            return dir * na.localeCompare(nb);
          }
          // date: newest rated track per album
          const latestA = Math.max(...a.songs.map((s: any) => new Date(s.created_at ?? 0).getTime()));
          const latestB = Math.max(...b.songs.map((s: any) => new Date(s.created_at ?? 0).getTime()));
          return dir * (latestB - latestA);
        });

        const filteredAlbums = sortedAlbums.filter((a) => {
          if (albumGenre !== "all" && !a.songs.some((s: any) => (s.genre_tags ?? []).includes(albumGenre))) return false;
          if (albumStatus === "complete") {
            const total = a.spotifyAlbumId ? albumTotals.get(a.spotifyAlbumId) ?? null : null;
            console.log(
              "[album completion]", a.albumName,
              "| rated:", a.songs.length,
              "| spotifyAlbumId:", a.spotifyAlbumId,
              "| total from Spotify:", total,
              "| totals map size:", albumTotals.size,
              "| isComplete:", total !== null && a.songs.length >= total
            );
            if (total === null || a.songs.length < total) return false;
          }
          return true;
        });

        return (
        <>
          {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && albumGroups.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">💿</p>
              <p className="font-medium text-white/50">No albums yet</p>
              <Link href="/search" className="text-[#4fa8ff] text-sm font-semibold hover:underline mt-1 block">Rate songs →</Link>
            </div>
          )}

          {albumGroups.length > 0 && (
            <>
              {/* ── Row 1: Sort ── */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide w-9 shrink-0">Sort</span>
                <div className="flex gap-2">
                  {(["score", "artist", "date"] as AlbumSortKey[]).map((s) => {
                    const isActive = albumSort === s;
                    const defaultDir: "asc" | "desc" = s === "artist" ? "asc" : "desc";
                    const currentDir = isActive ? albumSortDir : defaultDir;
                    const arrow = currentDir === "desc" ? "↓" : "↑";
                    const label = s.charAt(0).toUpperCase() + s.slice(1);
                    return (
                      <button key={s}
                        onClick={() => {
                          if (isActive) setAlbumSortDir((d) => d === "desc" ? "asc" : "desc");
                          else { setAlbumSort(s); setAlbumSortDir(defaultDir); }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                          isActive
                            ? "text-white border-transparent bg-gradient-accent"
                            : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                        }`}>
                        {arrow} {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Row 2: Genre ── */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide w-9 shrink-0">Genre</span>
                <div className="flex gap-2 overflow-x-auto pb-0.5 -mr-4 pr-4">
                  {["all", ...albumAllGenres].map((g) => (
                    <button key={g} onClick={() => setAlbumGenre(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                        albumGenre === g ? "bg-slate-100 text-gray-900 border-slate-100" : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                      }`}>
                      {g === "all" ? "All" : g}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Row 3: Status ── */}
              <div className="flex items-center gap-2 mb-5">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide w-9 shrink-0">Status</span>
                <div className="flex gap-2">
                  {(["all", "complete"] as const).map((s) => (
                    <button key={s} onClick={() => setAlbumStatus(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                        albumStatus === s ? "text-white border-transparent bg-gradient-accent" : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                      }`}>
                      {s === "all" ? "All" : "Complete only"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {filteredAlbums.length === 0 && albumGroups.length > 0 && (
            <div className="text-center py-12">
              {albumStatus === "complete" && !albumTotalsLoaded ? (
                <p className="font-medium text-white/50">Loading album data from Spotify…</p>
              ) : (
                <>
                  <p className="font-medium text-white/50">
                    {albumStatus === "complete"
                      ? "No fully rated albums detected yet"
                      : "No albums in this genre yet"}
                  </p>
                  {albumStatus === "complete" && (
                    <p className="text-xs text-white/30 mt-1 max-w-[240px] mx-auto">
                      Albums rated before the Spotify ID migration may not be detected. Check the console for details.
                    </p>
                  )}
                  <button onClick={() => { setAlbumGenre("all"); setAlbumStatus("all"); }}
                    className="text-[#4fa8ff] text-xs font-semibold mt-3 hover:underline">
                    Clear filters →
                  </button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            {filteredAlbums.map((a) => {
              const total = a.spotifyAlbumId ? albumTotals.get(a.spotifyAlbumId) ?? null : null;
              const rated = a.songs.length;
              const pct = total ? Math.round((rated / total) * 100) : null;
              const isComplete = total !== null && rated >= total;

              // Prefer Spotify's artist name to fix "Tyler" → "Tyler, The Creator"
              const displayArtist = (a.spotifyAlbumId && albumArtists.get(a.spotifyAlbumId)) ?? a.artist;

              const inner = (
                <div className="flex items-center gap-3 p-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {a.albumArt
                      ? <Image src={a.albumArt} alt={a.albumName} fill className="object-cover" sizes="64px" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-100 truncate">{a.albumName}</p>
                    <p className="text-xs text-white/50 truncate mt-0.5">{displayArtist}</p>

                    {/* Completion badge */}
                    {total !== null ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        {isComplete ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/25 text-emerald-300 tracking-wide">
                            ALBUM COMPLETE ✓
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-400">
                            In progress · {rated}/{total}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/38 mt-1.5">{rated} track{rated !== 1 ? "s" : ""} rated</p>
                    )}

                    {pct !== null && !isComplete && (
                      <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden w-full">
                        <div className="h-full rounded-full transition-all bg-amber-500/50"
                          style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    )}
                  </div>
                  <ScoreCircle score={a.avgScore} size={40} />
                </div>
              );

              return (
                <div
                  key={a.key}
                  onClick={() => handleAlbumTap(a)}
                  className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all"
                  style={isComplete ? {
                    border: "1px solid rgba(74,222,128,0.4)",
                    background: "#1A1A1A",
                    boxShadow: "0 0 0 1px rgba(74,222,128,0.15), 0 4px 16px rgba(74,222,128,0.08)",
                  } : {
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#1A1A1A",
                  }}
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </>
        );
      })()}

      {/* ── SONGS VIEW ── */}
      {libraryMode === "songs" && (
        <>
          {/* ── Row 1: Sort — fixed width, no scroll ── */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide w-9 shrink-0">Sort</span>
            <div className="flex gap-2">
              {(["score", "artist", "date"] as SortKey[]).map((s) => {
                const isActive = sort === s;
                // Default direction per key: score↓, artist↑ A-Z, date↓ newest
                const defaultDir: "asc" | "desc" = s === "artist" ? "asc" : "desc";
                const currentDir = isActive ? sortDir : defaultDir;
                const arrow = currentDir === "desc" ? "↓" : "↑";
                const label = s.charAt(0).toUpperCase() + s.slice(1);

                function handleClick() {
                  if (isActive) {
                    setSortDir((d) => d === "desc" ? "asc" : "desc");
                  } else {
                    setSort(s);
                    setSortDir(defaultDir);
                  }
                }

                return (
                  <button key={s} onClick={handleClick}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      isActive
                        ? "text-white border-transparent bg-gradient-accent"
                        : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                    }`}>
                    {arrow} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Row 2: Genre — horizontally scrollable ── */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide w-9 shrink-0">Genre</span>
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mr-4 pr-4">
              <button onClick={() => setGenre("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                  genre === "all" ? "bg-slate-100 text-gray-900 border-slate-100" : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                }`}>All</button>
              {genres.map((g) => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                    genre === g ? "bg-slate-100 text-gray-900 border-slate-100" : "bg-white/5 text-white/50 border-white/10 hover:border-white/12"
                  }`}>{g}</button>
              ))}
            </div>
          </div>

          {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📚</p>
              <p className="font-medium text-white/50">No ratings yet</p>
              <Link href="/search" className="text-[#4fa8ff] text-sm font-semibold hover:underline mt-1 block">Rate your first song →</Link>
            </div>
          )}

          {view === "list" ? (
            <div className="space-y-2">
              {filtered.map((r) => {
                const accentColor = genreAccentColor(r.genre_tags ?? []);
                return (
                  <Link key={r.id} href={`/song/${r.id}`} className="block group">
                    <div className="bg-[#1A1A1A] rounded-2xl border border-white/8 group-hover:border-white/10 transition-colors overflow-hidden">
                      {/* Pokemon accent */}
                      {accentColor && (
                        <div className="flex justify-center pt-2">
                          <div className="h-[3px] rounded-full" style={{ width: "60%", background: `linear-gradient(to right, ${accentColor}, transparent)` }} />
                        </div>
                      )}
                      <div className={`flex items-center gap-3 px-3 pb-3 ${accentColor ? "pt-2" : "pt-3"}`}>
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {r.song.album_art_url
                            ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                            : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-slate-100 truncate">{r.song.title}</p>
                            <span className="text-xs text-white/38 shrink-0 mt-0.5">{formatDuration(r.song.duration_seconds)}</span>
                          </div>
                          <p className="text-xs text-white/50 truncate">{r.song.artist}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {displayGenres(r.genre_tags ?? []).map((t: string) => (
                              <span key={t} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">{t}</span>
                            ))}
                          </div>
                          <p className="text-xs text-white/28 mt-0.5">
                            Rated {new Date(r.created_at).getMonth() + 1}/{new Date(r.created_at).getDate()}
                          </p>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); openReRate(r); }} className="hover:opacity-75 transition-opacity">
                          <ScoreCircle score={r.overall_score} size={44} />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {filtered.map((r) => (
                <Link key={r.id} href={`/song/${r.id}`} className="relative rounded-2xl overflow-hidden aspect-square bg-white/5 group block">
                  {r.song.album_art_url
                    ? <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="33vw" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]" />}

                  {/* Hover darkening */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />

                  {/* Bottom gradient + song info overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-[40%]"
                    style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.75))" }}>
                    <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pr-8">
                      <p className="text-white font-bold leading-tight line-clamp-2"
                        style={{ fontSize: 13, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                        {r.song.title}
                      </p>
                      <p className="truncate mt-0.5"
                        style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {r.song.artist}
                      </p>
                    </div>
                  </div>

                  {/* Score circle — above the overlay */}
                  <div className="absolute bottom-1.5 right-1.5 z-10">
                    <ScoreCircle score={r.overall_score} size={28} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => { setRatingTrack(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
