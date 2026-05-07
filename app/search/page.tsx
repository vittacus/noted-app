"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { SpotifyTrack, SpotifyAlbum } from "@/types";
import { formatDuration } from "@/lib/utils";
import RatingModal from "@/components/RatingModal";
import RecommendedTracks from "@/components/RecommendedTracks";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "tracks" | "albums";

export default function SearchPage() {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([]);
  const [tab, setTab] = useState<Tab>("tracks");
  const [loading, setLoading] = useState(false);
  const [ratingTrack, setRatingTrack] = useState<SpotifyTrack | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Seeds for the "Suggested for you" section
  const [seedTrackIds, setSeedTrackIds] = useState<string[]>([]);
  const [ratedSpotifyIds, setRatedSpotifyIds] = useState<string[]>([]);
  const [topArtistNames, setTopArtistNames] = useState<string[]>([]);

  useEffect(() => {
    async function loadSeeds() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("ratings")
        .select("overall_score, song:songs(spotify_id, artist)")
        .eq("user_id", user.id)
        .order("overall_score", { ascending: false });
      if (!data) return;
      const rows = data as any[];
      setSeedTrackIds(rows.slice(0, 3).map((r: any) => r.song?.spotify_id).filter(Boolean));
      setRatedSpotifyIds(rows.map((r: any) => r.song?.spotify_id).filter(Boolean));
      const seen = new Set<string>();
      setTopArtistNames(
        rows.map((r: any) => r.song?.artist?.trim())
          .filter((a: string) => a && !seen.has(a) && seen.add(a))
          .slice(0, 5)
      );
    }
    loadSeeds();
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setTracks([]); setAlbums([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&type=track,album`);
      const data = await res.json();
      setTracks(data.tracks?.items ?? []);
      setAlbums(data.albums?.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") search(query);
  }

  async function handleRate(track: SpotifyTrack) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setRatingTrack(track);
  }

  const showSuggested = isFocused && !query && seedTrackIds.length > 0;

  return (
    <div className="page-enter">
      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Search songs and albums…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1e2d3d] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/50"
          autoFocus
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4fc3f7] animate-spin" />
        )}
      </div>

      {/* Suggested for you — shown when focused with empty query */}
      {showSuggested && (
        <div className="mb-2">
          <RecommendedTracks
            seedTrackIds={seedTrackIds}
            ratedSpotifyIds={ratedSpotifyIds}
            topArtistNames={topArtistNames}
            title="Suggested for you"
            limit={8}
          />
        </div>
      )}

      {/* Search results tabs */}
      {(tracks.length > 0 || albums.length > 0) && (
        <div className="flex gap-1 mb-4 bg-white/5 rounded-2xl p-1">
          {(["tracks", "albums"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all capitalize ${
                tab === t ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t} ({t === "tracks" ? tracks.length : albums.length})
            </button>
          ))}
        </div>
      )}

      {tab === "tracks" && (
        <div className="space-y-2">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                {track.album.images[0] ? (
                  <Image src={track.album.images[0].url} alt={track.album.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-slate-100 truncate">{track.name}</p>
                  <span className="text-xs text-slate-600 shrink-0 mt-0.5">{formatDuration(Math.round(track.duration_ms / 1000))}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
                <p className="text-xs text-slate-600 truncate">{track.album.name}</p>
              </div>
              <button
                onClick={() => handleRate(track)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-[#4fc3f7]/10 text-[#4fc3f7] text-xs font-semibold hover:bg-[#4fc3f7]/20 transition-colors border border-[#4fc3f7]/20"
              >
                Rate
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="space-y-2">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/album/${album.id}`}
              className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                {album.images[0] ? (
                  <Image src={album.images[0].url} alt={album.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-100 truncate">{album.name}</p>
                <p className="text-xs text-slate-500 truncate">{album.artists.map((a) => a.name).join(", ")}</p>
                <p className="text-xs text-slate-600">{album.release_date?.split("-")[0]} · {album.total_tracks} tracks</p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      {!loading && query && tracks.length === 0 && albums.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium text-slate-400">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!query && !showSuggested && (
        <div className="text-center py-16 text-slate-600">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-medium text-slate-400">Search for a song or album to rate</p>
        </div>
      )}

      {ratingTrack && (
        <RatingModal
          track={ratingTrack}
          onClose={() => setRatingTrack(null)}
          onSaved={() => {
            setRatingTrack(null);
            router.push("/library");
          }}
        />
      )}
    </div>
  );
}
