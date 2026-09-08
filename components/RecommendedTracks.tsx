"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
  onRate?: (track: SpotifyTrack) => void;
  /** Render as a compact vertical list for the sidebar */
  compact?: boolean;
}

export default function RecommendedTracks({
  seedTrackIds,
  ratedSpotifyIds,
  topArtistNames = [],
  title = "Recommended for you",
  limit = 10,
  onRate,
  compact = false,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const seeds = seedTrackIds.slice(0, 3);
  const ratedSet = new Set(ratedSpotifyIds);
  const fetchLimit = compact ? 4 : limit;

  useEffect(() => {
    if (!seeds.length || hasFetched.current) return;
    hasFetched.current = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/recommendations?track_ids=${seeds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = ((data.tracks ?? []) as SpotifyTrack[])
            .filter((t) => !ratedSet.has(t.id))
            .slice(0, fetchLimit);
          if (filtered.length > 0) {
            setTracks(filtered);
            setLoading(false);
            return;
          }
        }

        const fallback: SpotifyTrack[] = [];
        const seen = new Set<string>(ratedSet);
        for (const artist of topArtistNames.slice(0, 3)) {
          if (fallback.length >= fetchLimit) break;
          try {
            const r = await fetch(`/api/spotify/search?q=${encodeURIComponent(artist)}&type=track`);
            if (!r.ok) continue;
            const d = await r.json();
            for (const t of (d.tracks?.items ?? []) as SpotifyTrack[]) {
              if (!seen.has(t.id)) {
                seen.add(t.id);
                fallback.push(t);
                if (fallback.length >= fetchLimit) break;
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

  // ── Loading skeletons ────────────────────────────────────────────────────
  if (loading) {
    if (compact) {
      return (
        <div>
          <p className="text-sm font-bold text-slate-100 mb-3">{title}</p>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-white/5 rounded-full w-3/4" />
                  <div className="h-2 bg-white/5 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="mb-8">
        <div className="mb-3">
          <h2 className="font-bold text-base text-slate-100">{title}</h2>
          <p className="text-xs text-white/38 mt-0.5">Based on your top rated songs</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[120px] bg-[#111111] rounded-2xl border border-white/8 overflow-hidden animate-pulse">
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

  // ── Compact sidebar list ─────────────────────────────────────────────────
  if (compact) {
    return (
      <div>
        <p className="text-sm font-bold text-slate-100 mb-3">{title}</p>
        <div className="space-y-0.5">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handleRate(track)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
                {track.album?.images?.[0] ? (
                  <Image src={track.album.images[0].url} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full bg-[#1A1A1A]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{track.name}</p>
                <p className="text-xs text-white/45 truncate mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#F5A623] px-2 py-1 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                Rate
              </span>
            </button>
          ))}
        </div>
        <Link href="/search" className="block text-xs text-[#F5A623] hover:underline mt-2 px-2">
          See more →
        </Link>
        {!onRate && ratingTrack && (
          <RatingModal
            track={ratingTrack}
            onClose={() => setRatingTrack(null)}
            onSaved={() => {
              setRatingTrack(null);
              setTracks((prev) => prev.filter((t) => t.id !== ratingTrack.id));
              if (typeof window !== "undefined") sessionStorage.setItem("new_rating_ts", Date.now().toString());
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  // ── Mobile horizontal-scroll cards ───────────────────────────────────────
  return (
    <div className="mb-8">
      <div className="mb-3">
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        <p className="text-xs text-white/38 mt-0.5">Based on your top rated songs</p>
      </div>

      {/* Gradient fade on the right edge signals more content off-screen */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
        style={{
          WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
        }}
      >
        {tracks.map((track) => (
          <div
            key={track.id}
            className="shrink-0 w-[120px] rounded-2xl border border-white/8 overflow-hidden flex flex-col hover:border-white/20 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: "#111111" }}
            onClick={() => handleRate(track)}
          >
            <div className="relative w-full aspect-square">
              {track.album?.images?.[0] ? (
                <Image src={track.album.images[0].url} alt={track.album?.name ?? ""} fill className="object-cover" sizes="120px" />
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: "#1A1A1A" }} />
              )}
              <div
                className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))" }}
              >
                <p className="text-white font-bold text-[11px] line-clamp-2 leading-tight">{track.name}</p>
                <p className="text-white/60 text-[10px] truncate mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
              </div>
            </div>
            <div className="p-1.5 pt-1">
              <div
                className="w-full py-2.5 rounded-xl text-center text-black font-bold text-[13px] select-none"
                style={{ background: "#F5A623" }}
              >
                ＋ Rate
              </div>
            </div>
          </div>
        ))}
      </div>

      {!onRate && ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => {
            setRatingTrack(null);
            setTracks((prev) => prev.filter((t) => t.id !== ratingTrack.id));
            if (typeof window !== "undefined") sessionStorage.setItem("new_rating_ts", Date.now().toString());
            router.refresh();
            setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 450);
          }}
        />
      )}
    </div>
  );
}
