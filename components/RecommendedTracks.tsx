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
      {/* Section header — 20px / 700 */}
      <div className="mb-3">
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        <p className="text-xs text-white/38 mt-0.5">Based on your top rated songs</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {tracks.map((track) => (
          /* Square card — image fills full area, gradient overlay with text */
          <button
            key={track.id}
            onClick={() => handleRate(track)}
            className="shrink-0 w-[120px] aspect-square rounded-2xl border border-white/8 overflow-hidden relative hover:border-white/20 active:scale-95 transition-all"
            style={{ backgroundColor: "#1A1A1A" }}
          >
            {/* Album art — fills the whole card */}
            {track.album?.images?.[0] ? (
              <Image src={track.album.images[0].url} alt={track.album?.name ?? ""} fill className="object-cover" sizes="120px" />
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: "#242424" }} />
            )}

            {/* Gradient overlay — bottom 35% → text on image */}
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col justify-end px-2 pb-2 pt-6"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.82))", height: "65%" }}
            >
              <p className="text-white font-bold text-[11px] line-clamp-2 leading-tight">{track.name}</p>
              <p className="text-white/60 text-[10px] truncate mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
              <p className="text-[#4fa8ff] text-[10px] font-semibold mt-1">+ Rate</p>
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
            // Mark that a new rating was just added so home page can highlight it
            if (typeof window !== "undefined") {
              sessionStorage.setItem("new_rating_ts", Date.now().toString());
            }
            router.refresh();
            // Scroll to top after page refresh so new rating is visible
            setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 450);
          }}
        />
      )}
    </div>
  );
}
