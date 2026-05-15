"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { formatDuration, scoreColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SpotifyAlbum, SpotifyTrack } from "@/types";
import RatingModal from "@/components/RatingModal";
import { useRouter } from "next/navigation";

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [album, setAlbum] = useState<SpotifyAlbum | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);
  const [dbAlbumScore, setDbAlbumScore] = useState<{ calculated: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [albumRes, { data: { user } }] = await Promise.all([
        fetch(`/api/spotify/album/${albumId}`),
        supabase.auth.getUser(),
      ]);
      const albumData = await albumRes.json();
      setAlbum(albumData);

      if (user && albumData.tracks?.items?.length) {
        const spotifyIds = albumData.tracks.items.map((t: SpotifyTrack) => t.id);
        const { data: songs } = await supabase
          .from("songs")
          .select("id, spotify_id")
          .in("spotify_id", spotifyIds);

        if (songs?.length) {
          const songIds = songs.map((s: any) => s.id);
          const { data: ratings } = await supabase
            .from("ratings")
            .select("song_id, overall_score, songs(spotify_id)")
            .eq("user_id", user.id)
            .in("song_id", songIds);

          const map: Record<string, number> = {};
          ratings?.forEach((r: any) => {
            if (r.songs?.spotify_id) map[r.songs.spotify_id] = r.overall_score;
          });
          setUserRatings(map);

          const scores = Object.values(map);
          if (scores.length > 0) {
            const calc = scores.reduce((a, b) => a + b, 0) / scores.length;
            setDbAlbumScore({ calculated: Math.round(calc * 10) / 10 });
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [albumId]);

  async function handleRate(track: SpotifyTrack) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    // Spotify's album-tracks endpoint returns SimplifiedTrackObject which has no `album` field.
    // Augment with the parent album so RatingModal can display art and save the album ID.
    const fullTrack: SpotifyTrack = {
      ...track,
      album: (track as any).album ?? (album ? {
        id: album.id,
        name: album.name,
        images: album.images,
        release_date: album.release_date,
      } : { id: "", name: "", images: [], release_date: "" }),
    };
    setRatingTrack(fullTrack);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) return <p className="text-center py-10 text-white/50">Album not found.</p>;

  const artUrl = album.images[0]?.url;
  const artist = album.artists.map((a) => a.name).join(", ");
  const year = album.release_date?.split("-")[0];
  const tracks = album.tracks?.items ?? [];
  const ratedCount = Object.keys(userRatings).length;

  return (
    <div className="page-enter">
      <div className="flex gap-4 mb-5">
        {artUrl && (
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-xl shadow-black/40">
            <Image src={artUrl} alt={album.name} fill className="object-cover" sizes="96px" />
          </div>
        )}
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="font-black text-lg text-slate-100 leading-tight">{album.name}</h1>
          <p className="text-sm text-white/50 mt-0.5">{artist}</p>
          <p className="text-xs text-white/38">{year} · {album.total_tracks} tracks</p>

          {dbAlbumScore?.calculated !== null && dbAlbumScore && (
            <div className="mt-2">
              <p className={`text-lg font-black ${scoreColor(dbAlbumScore.calculated!)}`}>
                {dbAlbumScore.calculated!.toFixed(1)}
              </p>
              <p className="text-xs text-white/38">avg of {ratedCount} rated</p>
            </div>
          )}
        </div>
      </div>

      {/* Congratulations banner — when every track has been rated */}
      {ratedCount > 0 && tracks.length > 0 && ratedCount >= tracks.length && (
        <div className="mb-5 rounded-2xl overflow-hidden"
          style={{
            border: "1px solid rgba(74,222,128,0.4)",
            background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(74,222,128,0.06))",
            boxShadow: "0 0 24px rgba(74,222,128,0.1)",
          }}>
          <div className="flex items-center gap-3 p-4">
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="font-bold text-emerald-300 text-sm">You've rated every track on this album</p>
              <p className="text-xs text-white/50 mt-0.5">
                Average score across all {tracks.length} tracks
              </p>
            </div>
            {dbAlbumScore?.calculated !== null && dbAlbumScore && (
              <p className="text-2xl font-black text-emerald-300">
                {dbAlbumScore.calculated!.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      )}

      {ratedCount > 0 && ratedCount < tracks.length && (
        <p className="text-xs text-white/38 mb-3">{ratedCount} of {album.total_tracks} tracks rated</p>
      )}

      <div className="space-y-1.5">
        {tracks.map((track, i) => {
          const myScore = userRatings[track.id];
          const rated = myScore !== undefined;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all ${
                rated
                  ? "bg-[#1A1A1A] border-white/8"
                  : "bg-white/3 border-white/[0.03] opacity-60"
              }`}
            >
              <span className="text-xs text-white/38 w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${rated ? "text-slate-100" : "text-white/50"}`}>
                  {track.name}
                </p>
                <p className="text-xs text-white/38 truncate">
                  {track.artists.map((a) => a.name).join(", ")} · {formatDuration(Math.round(track.duration_ms / 1000))}
                </p>
              </div>
              {rated ? (
                <span className={`text-sm font-black shrink-0 ${scoreColor(myScore)}`}>
                  {myScore.toFixed(1)}
                </span>
              ) : (
                <button
                  onClick={() => handleRate(track)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-[#4fa8ff]/10 text-[#4fa8ff] text-xs font-semibold hover:bg-[#4fa8ff]/20 transition-colors border border-[#4fa8ff]/20"
                >
                  Rate
                </button>
              )}
            </div>
          );
        })}
      </div>

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
