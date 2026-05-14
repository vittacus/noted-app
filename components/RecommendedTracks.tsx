"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SpotifyTrack } from "@/types";
import RatingModal from "@/components/RatingModal";

interface Props {
  seedTrackIds: string[];
  ratedSpotifyIds: string[];
  topArtistNames?: string[];
  title?: string;
  limit?: number;
}

export default function RecommendedTracks({
  seedTrackIds,
  ratedSpotifyIds,
  topArtistNames = [],
  title = "Recommended for you",
  limit = 10,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const seeds = seedTrackIds.slice(0, 3);
  const ratedSet = new Set(ratedSpotifyIds);

  useEffect(() => {
    if (!seeds.length || hasFetched.current) return;
    hasFetched.current = true;

    async function load() {
      setLoading(true);
      try {
        // Primary: Spotify recommendations
        const res = await fetch(`/api/spotify/recommendations?track_ids=${seeds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = ((data.tracks ?? []) as SpotifyTrack[])
            .filter((t) => !ratedSet.has(t.id))
            .slice(0, limit);
          if (filtered.length > 0) {
            setTracks(filtered);
            setLoading(false);
            return;
          }
        }

        // Fallback: search for tracks by each top artist
        console.log("[RecommendedTracks] primary failed, trying artist fallback for:", topArtistNames);
        const fallback: SpotifyTrack[] = [];
        const seen = new Set<string>(ratedSet);

        for (const artist of topArtistNames.slice(0, 3)) {
          if (fallback.length >= limit) break;
          try {
            const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(artist)}&type=track`);
            if (!r.ok) continue;
            const d = await r.json();
            for (const t of (d.tracks?.items ?? []) as SpotifyTrack[]) {
              if (!seen.has(t.id)) {
                seen.add(t.id);
                fallback.push(t);
                if (fallback.length >= limit) break;
              }
            }
          } catch {}
        }

        setTracks(fallback);
      } catch {
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [seeds.join(",")]);

  async function handleRate(track: SpotifyTrack) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setRatingTrack(track);
  }

  // Loading state — shows placeholder skeleton so user sees it mounting
  if (loading) {
    return (
      <div className="mb-8">
        <div className="mb-3">
          <h2 className="font-bold text-base text-slate-100">{title}</h2>
          <p className="text-xs text-white/38 mt-0.5">Based on your top rated songs</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[120px] bg-[#1A1A1A] rounded-2xl border border-white/8 overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-white/5" />
              <div className="p-2 space-y-1.5">
                <div className="h-2 bg-white/5 rounded-full w-3/4" />
                <div className="h-2 bg-white/5 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tracks.length) return null;

  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="font-bold text-base text-slate-100">{title}</h2>
        <p className="text-xs text-white/38 mt-0.5">Based on your top rated songs</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {tracks.map((track) => (
          <button
            key={track.id}
            onClick={() => handleRate(track)}
            className="shrink-0 w-[120px] rounded-2xl border border-white/8 overflow-hidden flex flex-col text-left hover:border-white/15 active:scale-95 transition-all"
            style={{ backgroundColor: "#1A1A1A" }}
          >
            {/* Image container — explicit dark bg so no bleed from album art */}
            <div className="relative w-full aspect-square overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>
              {track.album?.images?.[0] ? (
                <Image src={track.album.images[0].url} alt={track.album?.name ?? ""} fill className="object-cover" sizes="120px" />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: "#242424" }} />
              )}
            </div>
            <div className="p-2 flex flex-col flex-1 gap-1">
              <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">{track.name}</p>
              <p className="text-xs text-white/50 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
              <p className="mt-auto pt-1.5 text-xs font-semibold text-[#4fa8ff]">+ Rate</p>
            </div>
          </button>
        ))}
      </div>

      {ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => {
            setRatingTrack(null);
            setTracks((prev) => prev.filter((t) => t.id !== ratingTrack.id));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
