"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Disc3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { scoreColor, vibeLabel } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import AddToCollectionButton from "@/components/AddToCollectionButton";
import { SpotifyTrack } from "@/types";

const vibeEmoji: Record<string, string> = { loved: "🔥", liked: "👍", didnt_like: "😐" };

export default function SongDetailPage() {
  const { ratingId } = useParams<{ ratingId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [rating, setRating] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reRating, setReRating] = useState(false);
  const [albumSearching, setAlbumSearching] = useState(false);

  async function goToAlbum(song: any) {
    if (song.spotify_album_id) {
      router.push(`/album/${song.spotify_album_id}`);
      return;
    }
    setAlbumSearching(true);
    try {
      // Most accurate: fetch the full track from Spotify to get exact album.id
      if (song.spotify_id) {
        const res = await fetch(`/api/spotify/track/${song.spotify_id}`);
        if (res.ok) {
          const track = await res.json();
          const albumId = track.album?.id;
          if (albumId) { router.push(`/album/${albumId}`); return; }
        }
      }
      // Last resort: search by album name + artist (may be imprecise)
      const q = `${song.album_name} ${song.artist}`;
      const res2 = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&type=album`);
      const d2 = await res2.json();
      const albumId = d2.albums?.items?.[0]?.id;
      if (albumId) router.push(`/album/${albumId}`);
    } finally {
      setAlbumSearching(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [{ data: r }, { data: { user } }] = await Promise.all([
        supabase
          .from("ratings")
          .select("*, song:songs(*), user:users(username, avatar_url)")
          .eq("id", ratingId)
          .single(),
        supabase.auth.getUser(),
      ]);
      setRating(r);
      setCurrentUserId(user?.id ?? null);
      setLoading(false);
    }
    load();
  }, [ratingId]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rating) {
    return <p className="text-center py-16 text-[#8686AC]">Rating not found.</p>;
  }

  const song = rating.song;
  const isOwner = currentUserId === rating.user_id;
  const artUrl = song?.album_art_url;

  const reRateTrack: SpotifyTrack = {
    id: song.spotify_id,
    name: song.title,
    artists: [{ name: song.artist }],
    album: {
      id: song.spotify_album_id ?? "",
      name: song.album_name,
      images: artUrl ? [{ url: artUrl }] : [],
      release_date: "",
    },
    duration_ms: song.duration_seconds * 1000,
  };

  const dims = [
    { label: "Replay Value", value: rating.replay_value, color: "#4fa8ff" },
    { label: "Lyrics",       value: rating.lyrics,       color: "#a78bfa" },
    { label: "Production",   value: rating.production,   color: "#fb923c" },
  ];

  return (
    <div className="page-enter -mt-6 -mx-4">
      {/* Full-bleed blurred album art header */}
      <div className="relative h-64 overflow-hidden">
        {artUrl ? (
          <>
            <Image src={artUrl} alt={song.album_name} fill className="object-cover scale-110" sizes="100vw" />
            <div className="absolute inset-0 bg-[#1A1A4E]/70 backdrop-blur-xl" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F0E47] to-[#1A1A4E]" />
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center hover:bg-black/50 transition-colors z-10"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Song identity */}
        <div className="absolute bottom-0 inset-x-0 p-5 flex items-end gap-4">
          {artUrl && (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-2xl">
              <Image src={artUrl} alt={song.album_name} fill className="object-cover" sizes="80px" />
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <p className="font-black text-xl text-white leading-tight line-clamp-2">{song.title}</p>
            <p className="text-sm text-white/70 mt-1 truncate">{song.artist}</p>
            <button
              onClick={() => goToAlbum(song)}
              disabled={albumSearching}
              className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#8686AC]/50 bg-[#505081]/30 hover:bg-[#505081]/50 active:scale-95 text-sm font-medium text-white transition-all disabled:opacity-50"
            >
              <Disc3 size={13} className="shrink-0" />
              <span className="truncate max-w-[160px]">
                {albumSearching ? "Finding…" : song.album_name}
              </span>
              {!albumSearching && <span className="text-white/50 shrink-0">→</span>}
            </button>
          </div>
          <div className={`text-4xl font-black tabular-nums shrink-0 pb-1 ${scoreColor(rating.overall_score)}`}>
            {rating.overall_score.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-4">
        {/* Dimension breakdown */}
        <div className="bg-[#2D2D6B] rounded-2xl border border-[#8686AC]/20 p-4">
          <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-3">Breakdown</p>
          <div className="space-y-4">
            {dims.map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold" style={{ color }}>{label}</span>
                  <span className="font-bold text-slate-200 tabular-nums">{value}/10</span>
                </div>
                <div className="h-3 bg-[#505081]/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full taste-bar"
                    style={{ width: `${(value / 10) * 100}%`, backgroundColor: color, opacity: 0.85 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vibe + date */}
        <div className="bg-[#2D2D6B] rounded-2xl border border-[#8686AC]/20 p-4 flex gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-1">Vibe</p>
            <p className="text-sm font-semibold text-slate-200">
              {vibeEmoji[rating.vibe]} {vibeLabel(rating.vibe)}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-1">Listened</p>
            <p className="text-sm font-semibold text-slate-200">
              {new Date(rating.listened_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Tags */}
        {((rating.best_for_tags ?? []).length > 0 || (rating.genre_tags ?? []).length > 0) && (
          <div className="bg-[#2D2D6B] rounded-2xl border border-[#8686AC]/20 p-4">
            {(rating.best_for_tags ?? []).length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-2">Best for</p>
                <div className="flex flex-wrap gap-2">
                  {rating.best_for_tags.map((t: string) => (
                    <span key={t} className="px-3 py-1 bg-[#4fa8ff]/10 border border-[#4fa8ff]/20 text-[#4fa8ff] text-xs rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {(rating.genre_tags ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-2">Genre</p>
                <div className="flex flex-wrap gap-2">
                  {rating.genre_tags.map((t: string) => (
                    <span key={t} className="px-3 py-1 bg-[#505081]/20 border border-[#8686AC]/30 text-[#8686AC] text-xs rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {rating.notes && (
          <div className="bg-[#2D2D6B] rounded-2xl border border-[#8686AC]/20 p-4">
            <p className="text-xs font-semibold text-[#8686AC]/75 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-slate-300 italic leading-relaxed">&ldquo;{rating.notes}&rdquo;</p>
          </div>
        )}

        {/* Rated by (if not owner) */}
        {!isOwner && rating.user && (
          <p className="text-xs text-[#8686AC]/75 text-center">
            Rated by <span className="text-[#8686AC] font-semibold">{rating.user.username}</span>
          </p>
        )}

        {/* Owner actions */}
        {isOwner && (
          <>
            <button
              onClick={() => setReRating(true)}
              className="w-full h-12 rounded-2xl bg-[#4fa8ff]/50 text-white font-semibold text-sm hover:bg-[#3a90f0] transition-colors shadow-lg shadow-[#0F0E47]/50"
            >
              Re-rate this song
            </button>
            <AddToCollectionButton songId={song.id} />
          </>
        )}

        <div className="h-2" />
      </div>

      {reRating && (
        <RatingModal
          track={reRateTrack}
          onClose={() => setReRating(false)}
          onSaved={() => {
            setReRating(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
