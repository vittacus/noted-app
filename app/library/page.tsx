"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUpDown, Music2, LayoutGrid, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Rating, Song } from "@/types";
import { formatDuration } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import { SpotifyTrack } from "@/types";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";

type SortKey = "score" | "date" | "artist";
type ViewMode = "list" | "grid";

interface RatingWithSong extends Rating { song: Song; }

interface AlbumProgress {
  spotify_album_id: string;
  album_name: string;
  artist: string;
  album_art_url: string | null;
  rated_count: number;
  total_tracks: number | null;
}

export default function LibraryPage() {
  const supabase = createClient();
  const [ratings, setRatings] = useState<RatingWithSong[]>([]);
  const [albums, setAlbums] = useState<AlbumProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("date");
  const [genre, setGenre] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("list");
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
        const allGenres = Array.from(new Set(data.flatMap((r: any) => r.genre_tags ?? [])));
        setGenres(allGenres);

        // Build album progress groups from rated songs that have spotify_album_id
        const albumMap = new Map<string, AlbumProgress>();
        for (const r of data as any[]) {
          const s = r.song;
          if (!s?.spotify_album_id) continue;
          if (!albumMap.has(s.spotify_album_id)) {
            albumMap.set(s.spotify_album_id, {
              spotify_album_id: s.spotify_album_id,
              album_name: s.album_name,
              artist: s.artist,
              album_art_url: s.album_art_url,
              rated_count: 0,
              total_tracks: null,
            });
          }
          albumMap.get(s.spotify_album_id)!.rated_count++;
        }

        const grouped = Array.from(albumMap.values());
        setAlbums(grouped);

        // Fetch total track counts from Spotify in batches of 20
        if (grouped.length > 0) {
          const ids = grouped.map((a) => a.spotify_album_id);
          const batches: string[][] = [];
          for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));

          const totalsMap = new Map<string, number>();
          await Promise.all(
            batches.map(async (batch) => {
              const res = await fetch(`/api/spotify/albums?ids=${batch.join(",")}`);
              if (!res.ok) return;
              const { albums: spotifyAlbums } = await res.json();
              (spotifyAlbums ?? []).forEach((a: any) => {
                if (a?.id) totalsMap.set(a.id, a.total_tracks ?? null);
              });
            })
          );

          setAlbums((prev) =>
            prev.map((a) => ({ ...a, total_tracks: totalsMap.get(a.spotify_album_id) ?? null }))
          );
        }
      }

      setLoading(false);
    }
    load();
  }, []);

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
        id: r.song.spotify_album_id ?? "",
        name: r.song.album_name,
        images: r.song.album_art_url ? [{ url: r.song.album_art_url }] : [],
        release_date: "",
      },
      duration_ms: r.song.duration_seconds * 1000,
    });
  }

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl text-slate-100">Library</h1>
        <div className="flex gap-2">
          <Link href="/battle"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4fc3f7]/10 border border-[#4fc3f7]/20 text-[#4fc3f7] text-xs font-semibold hover:bg-[#4fc3f7]/20 transition-colors"
          >
            <Swords size={13} /> Battle
          </Link>
          <button
            onClick={() => setView(view === "list" ? "grid" : "list")}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            {view === "list" ? <LayoutGrid size={16} className="text-slate-400" /> : <Music2 size={16} className="text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Albums in progress */}
      {albums.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Albums in progress</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {albums.map((a) => {
              const pct = a.total_tracks ? Math.round((a.rated_count / a.total_tracks) * 100) : null;
              return (
                <Link
                  key={a.spotify_album_id}
                  href={`/album/${a.spotify_album_id}`}
                  className="shrink-0 w-36 bg-[#1e2d3d] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
                >
                  <div className="relative w-full aspect-square bg-white/5">
                    {a.album_art_url ? (
                      <Image src={a.album_art_url} alt={a.album_name} fill className="object-cover" sizes="144px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-200 truncate">{a.album_name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{a.artist.split(",")[0]}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {a.rated_count}{a.total_tracks ? `/${a.total_tracks}` : ""} tracks
                    </p>
                    {pct !== null && (
                      <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4fc3f7]/50 rounded-full taste-bar" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort + genre filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {(["date", "score", "artist"] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              sort === s ? "bg-[#4fc3f7]/50 text-white border-[#4fc3f7]" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
            }`}
          >
            <ArrowUpDown size={11} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1 self-stretch" />
        <button
          onClick={() => setGenre("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
            genre === "all" ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
          }`}
        >All</button>
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              genre === g ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
            }`}
          >{g}</button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

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
                <button
                  onClick={(e) => { e.preventDefault(); openReRate(r); }}
                  className="hover:opacity-75 transition-opacity"
                >
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
