"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUpDown, Music2, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Rating, Song } from "@/types";
import { formatDuration, scoreColor } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import { SpotifyTrack } from "@/types";
import Link from "next/link";

type SortKey = "score" | "date" | "artist";
type ViewMode = "list" | "grid";

interface RatingWithSong extends Rating {
  song: Song;
}

export default function LibraryPage() {
  const supabase = createClient();
  const [ratings, setRatings] = useState<RatingWithSong[]>([]);
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
    const track: SpotifyTrack = {
      id: r.song.spotify_id,
      name: r.song.title,
      artists: [{ name: r.song.artist }],
      album: {
        id: "",
        name: r.song.album_name,
        images: r.song.album_art_url ? [{ url: r.song.album_art_url }] : [],
        release_date: "",
      },
      duration_ms: r.song.duration_seconds * 1000,
    };
    setRatingTrack(track);
  }

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl text-slate-900">Library</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "list" ? "grid" : "list")}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            {view === "list" ? <LayoutGrid size={16} className="text-slate-500" /> : <Music2 size={16} className="text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Sort + filter bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {(["date", "score", "artist"] as SortKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              sort === s
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            <ArrowUpDown size={11} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="w-px bg-slate-200 mx-1 self-stretch" />
        <button
          onClick={() => setGenre("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
            genre === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          All
        </button>
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              genre === g ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No ratings yet</p>
          <Link href="/search" className="text-blue-500 text-sm font-semibold hover:underline mt-1 block">
            Rate your first song →
          </Link>
        </div>
      )}

      {view === "list" ? (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {r.song.album_art_url ? (
                  <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-slate-900 truncate">{r.song.title}</p>
                  <span className="text-xs text-slate-400 shrink-0 mt-0.5">{formatDuration(r.song.duration_seconds)}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{r.song.artist}</p>
                <div className="flex gap-1.5 mt-1">
                  {(r.genre_tags ?? []).slice(0, 2).map((t: string) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => openReRate(r)}
                className={`text-xl font-black shrink-0 ${scoreColor(r.overall_score)} hover:opacity-70 transition-opacity`}
              >
                {r.overall_score.toFixed(1)}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => openReRate(r)}
              className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 group"
            >
              {r.song.album_art_url ? (
                <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="33vw" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
              <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                {r.overall_score.toFixed(1)}
              </div>
            </button>
          ))}
        </div>
      )}

      {ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => {
            setRatingTrack(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
