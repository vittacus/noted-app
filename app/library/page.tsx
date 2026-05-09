"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ArrowUpDown, Music2, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Rating, Song } from "@/types";
import { formatDuration } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import { SpotifyTrack } from "@/types";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";

type SortKey = "score" | "date" | "artist";
type ViewMode = "list" | "grid";
type LibraryMode = "songs" | "albums";

interface RatingWithSong extends Rating { song: Song; }

export default function LibraryPage() {
  const supabase = createClient();
  const [ratings, setRatings] = useState<RatingWithSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("date");
  const [genre, setGenre] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [libraryMode, setLibraryMode] = useState<LibraryMode>("songs");
  const [genres, setGenres] = useState<string[]>([]);
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);

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

  // Grouped by album for Albums view
  const albumGroups = useMemo(() => {
    const map = new Map<string, {
      key: string; albumName: string; artist: string;
      albumArt: string | null; spotifyAlbumId: string | null;
      songs: RatingWithSong[]; avgScore: number;
    }>();
    for (const r of ratings) {
      const key = (r.song as any).spotify_album_id || `${r.song.album_name}|${r.song.artist}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          albumName: r.song.album_name,
          artist: r.song.artist,
          albumArt: r.song.album_art_url,
          spotifyAlbumId: (r.song as any).spotify_album_id ?? null,
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

  const filtered = ratings
    .filter((r) => genre === "all" || (r.genre_tags ?? []).includes(genre))
    .sort((a, b) => {
      if (sort === "score") return b.overall_score - a.overall_score;
      if (sort === "artist") return a.song.artist.localeCompare(b.song.artist);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
          <Link href="/battle" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            ⚔ Battle mode
          </Link>
          {libraryMode === "songs" && (
            <button
              onClick={() => setView(view === "list" ? "grid" : "list")}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              {view === "list" ? <LayoutGrid size={16} className="text-slate-400" /> : <Music2 size={16} className="text-slate-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Songs / Albums toggle */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-5">
        {(["songs", "albums"] as LibraryMode[]).map((m) => (
          <button key={m} onClick={() => setLibraryMode(m)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all capitalize ${
              libraryMode === m ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {m} {m === "songs" ? `(${ratings.length})` : `(${albumGroups.length})`}
          </button>
        ))}
      </div>

      {/* ── ALBUMS VIEW ── */}
      {libraryMode === "albums" && (
        <>
          {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && albumGroups.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">💿</p>
              <p className="font-medium text-slate-400">No albums yet</p>
              <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline mt-1 block">Rate songs to build your collection →</Link>
            </div>
          )}
          <div className="space-y-2">
            {albumGroups.map((a) => (
              <div key={a.key} className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                {/* Larger album art */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                  {a.albumArt
                    ? <Image src={a.albumArt} alt={a.albumName} fill className="object-cover" sizes="64px" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                </div>
                <div className="flex-1 min-w-0">
                  {a.spotifyAlbumId ? (
                    <Link href={`/album/${a.spotifyAlbumId}`} className="font-bold text-sm text-slate-100 truncate block hover:text-[#4fc3f7] transition-colors">
                      {a.albumName}
                    </Link>
                  ) : (
                    <p className="font-bold text-sm text-slate-100 truncate">{a.albumName}</p>
                  )}
                  <p className="text-xs text-slate-500 truncate mt-0.5">{a.artist.split(",")[0]}</p>
                  <p className="text-xs text-slate-600 mt-1">{a.songs.length} song{a.songs.length !== 1 ? "s" : ""} rated</p>
                </div>
                <ScoreCircle score={a.avgScore} size={44} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SONGS VIEW ── */}
      {libraryMode === "songs" && (
        <>
          {/* Sort + genre filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
            {(["date", "score", "artist"] as SortKey[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  sort === s ? "bg-[#4fc3f7]/50 text-white border-[#4fc3f7]" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                }`}
              >
                <ArrowUpDown size={11} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <div className="w-px bg-white/10 mx-1 self-stretch" />
            <button onClick={() => setGenre("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                genre === "all" ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >All</button>
            {genres.map((g) => (
              <button key={g} onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  genre === g ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                }`}
              >{g}</button>
            ))}
          </div>

          {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" /></div>}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📚</p>
              <p className="font-medium text-slate-400">No ratings yet</p>
              <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline mt-1 block">Rate your first song →</Link>
            </div>
          )}

          {view === "list" ? (
            <div className="space-y-2">
              {filtered.map((r) => (
                <Link key={r.id} href={`/song/${r.id}`} className="block group">
                  <div className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                      {r.song.album_art_url
                        ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-slate-100 truncate">{r.song.title}</p>
                        <span className="text-xs text-slate-600 shrink-0 mt-0.5">{formatDuration(r.song.duration_seconds)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{r.song.artist}</p>
                      <div className="flex gap-1.5 mt-1">
                        {(r.genre_tags ?? []).slice(0, 2).map((t: string) => (
                          <span key={t} className="text-xs bg-white/5 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); openReRate(r); }} className="hover:opacity-75 transition-opacity">
                      <ScoreCircle score={r.overall_score} size={44} />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {filtered.map((r) => (
                <Link key={r.id} href={`/song/${r.id}`} className="relative rounded-2xl overflow-hidden aspect-square bg-white/5 group block">
                  {r.song.album_art_url
                    ? <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="33vw" />
                    : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                  <div className="absolute bottom-1.5 right-1.5">
                    <ScoreCircle score={r.overall_score} size={32} />
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
