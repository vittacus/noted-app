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
  /** If provided, the parent manages the rating modal. Otherwise the component renders its own. */
  onRate?: (track: SpotifyTrack) => void;
}

export default function RecommendedTracks({
  seedTrackIds,
  ratedSpotifyIds,
  topArtistNames = [],
  title = "Recommended for you",
  limit = 10,
  onRate,
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
    if (onRate) { onRate(track); return; }
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
          /* Card: square image on top + full-width gradient Rate button below */
          <div
            key={track.id}
            className="shrink-0 w-[120px] rounded-2xl border border-white/8 overflow-hidden flex flex-col hover:border-white/20 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: "#1A1A1A" }}
            onClick={() => handleRate(track)}
          >
            {/* Square album art with name overlay */}
            <div className="relative w-full aspect-square">
              {track.album?.images?.[0] ? (
                <Image src={track.album.images[0].url} alt={track.album?.name ?? ""} fill className="object-cover" sizes="120px" />
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: "#242424" }} />
              )}
              <div
                className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))" }}
              >
                <p className="text-white font-bold text-[11px] line-clamp-2 leading-tight">{track.name}</p>
                <p className="text-white/60 text-[10px] truncate mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
              </div>
            </div>

            {/* Full-width CTA button */}
            <div className="p-1.5 pt-1">
              <div
                className="w-full py-2.5 rounded-xl text-center text-white font-bold text-[13px] select-none"
                style={{ background: "linear-gradient(135deg, #4fa8ff, #9747FF)" }}
              >
                ＋ Rate
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Only render own modal when parent hasn't taken over via onRate prop */}
      {!onRate && ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => {
            setRatingTrack(null);
            setTracks((prev) => prev.filter((t) => t.id !== ratingTrack.id));
            if (typeof window !== "undefined") {
              sessionStorage.setItem("new_rating_ts", Date.now().toString());
            }
            router.refresh();
            setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 450);
          }}
        />
      )}
    </div>
  );
}
