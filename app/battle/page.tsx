"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords, ArrowLeft, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ratingElo, updateElo, eloToDisplayScore } from "@/lib/elo";
import ScoreCircle from "@/components/ScoreCircle";

interface BattleSong {
  ratingId: string;
  songId: string;
  title: string;
  artist: string;
  albumArt: string | null;
  albumName: string;
  elo: number;
  displayScore: number;
}

export default function BattlePage() {
  const router = useRouter();
  const supabase = createClient();

  const [allRatings, setAllRatings] = useState<BattleSong[]>([]);
  const [pair, setPair] = useState<[BattleSong, BattleSong] | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [lastResult, setLastResult] = useState<{ winner: string; delta: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setAuthChecked(true);

      const { data } = await supabase
        .from("ratings")
        .select("id, overall_score, elo_score, song:songs(id, title, artist, album_art_url, album_name)")
        .eq("user_id", user.id);

      if (!data) { setLoading(false); return; }

      const songs: BattleSong[] = (data as any[]).map((r) => {
        const elo = ratingElo(r);
        return {
          ratingId: r.id,
          songId: r.song?.id,
          title: r.song?.title ?? "Unknown",
          artist: r.song?.artist ?? "Unknown",
          albumArt: r.song?.album_art_url ?? null,
          albumName: r.song?.album_name ?? "",
          elo,
          displayScore: eloToDisplayScore(elo),
        };
      });

      setAllRatings(songs);
      setLoading(false);
    }
    load();
  }, []);

  const pickPair = useCallback((songs: BattleSong[]) => {
    if (songs.length < 2) { setPair(null); return; }

    // Sort by ELO, find consecutive pairs within 200
    const sorted = [...songs].sort((a, b) => a.elo - b.elo);
    const closePairs: [BattleSong, BattleSong][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Math.abs(sorted[i].elo - sorted[i + 1].elo) <= 200) {
        closePairs.push([sorted[i], sorted[i + 1]]);
      }
    }

    // Fall back to any pair if none within 200
    const pool = closePairs.length > 0 ? closePairs
      : [[sorted[0], sorted[sorted.length - 1]] as [BattleSong, BattleSong]];

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    // Randomly swap so "left" isn't always lower-ELO
    setPair(Math.random() > 0.5 ? chosen : [chosen[1], chosen[0]]);
  }, []);

  useEffect(() => {
    if (!loading && allRatings.length >= 2) pickPair(allRatings);
  }, [loading, allRatings]);

  async function handlePick(winner: BattleSong, loser: BattleSong) {
    if (selecting) return;
    setSelecting(true);

    const { winner: newW, loser: newL } = updateElo(winner.elo, loser.elo);
    const delta = newW - winner.elo;

    // Optimistically update local state
    setAllRatings((prev) =>
      prev.map((s) => {
        if (s.ratingId === winner.ratingId) return { ...s, elo: newW, displayScore: eloToDisplayScore(newW) };
        if (s.ratingId === loser.ratingId)  return { ...s, elo: newL, displayScore: eloToDisplayScore(newL) };
        return s;
      })
    );

    setLastResult({ winner: winner.title, delta });
    setStreak((s) => s + 1);

    // Persist
    await Promise.all([
      supabase.from("ratings").update({ elo_score: newW, overall_score: eloToDisplayScore(newW) }).eq("id", winner.ratingId),
      supabase.from("ratings").update({ elo_score: newL, overall_score: eloToDisplayScore(newL) }).eq("id", loser.ratingId),
    ]);

    // Brief pause then next pair
    await new Promise((r) => setTimeout(r, 600));
    setLastResult(null);
    setSelecting(false);
    setAllRatings((current) => {
      pickPair(current);
      return current;
    });
  }

  if (!authChecked || loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allRatings.length < 2) {
    return (
      <div className="page-enter text-center py-20">
        <Swords size={40} className="text-slate-600 mx-auto mb-4" />
        <p className="font-bold text-slate-100 text-lg mb-2">Not enough songs yet</p>
        <p className="text-slate-500 text-sm mb-6">Rate at least 2 songs to start battling</p>
        <Link href="/search" className="inline-block px-6 py-3 bg-[#4fc3f7]/80 text-white font-semibold rounded-2xl hover:bg-[#4fc3f7] transition-colors">
          Rate songs →
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} className="text-slate-400" />
          </button>
          <div>
            <h1 className="font-black text-xl text-slate-100 flex items-center gap-2">
              <Swords size={20} className="text-[#4fc3f7]" /> Battle mode
            </h1>
            <p className="text-xs text-slate-500">Pick your preference — ELO updates live</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-[#fb923c]/10 border border-[#fb923c]/20 px-3 py-1.5 rounded-full">
            <Flame size={14} className="text-[#fb923c]" />
            <span className="text-sm font-bold text-[#fb923c] tabular-nums">{streak}</span>
          </div>
        )}
      </div>

      {/* Last result flash */}
      {lastResult && (
        <div className="text-center mb-4 animate-pulse">
          <p className="text-sm text-[#4ade80] font-semibold">
            +{lastResult.delta} ELO for {lastResult.winner}
          </p>
        </div>
      )}

      {/* Battle cards */}
      {pair && (
        <div className="flex gap-3 mb-5">
          {pair.map((song, idx) => {
            const isWinnerFlash = lastResult?.winner === song.title;
            return (
              <button
                key={song.ratingId}
                onClick={() => handlePick(song, pair[1 - idx]!)}
                disabled={selecting}
                className={`flex-1 flex flex-col rounded-3xl border-2 overflow-hidden transition-all duration-200 disabled:opacity-70 ${
                  isWinnerFlash
                    ? "border-[#4ade80] bg-[#4ade80]/10 scale-[1.02]"
                    : "border-white/10 bg-[#1e2d3d] hover:border-[#4fc3f7]/50 hover:scale-[1.01]"
                }`}
              >
                {/* Album art */}
                <div className="relative w-full aspect-square bg-white/5">
                  {song.albumArt ? (
                    <Image src={song.albumArt} alt={song.albumName} fill className="object-cover" sizes="50vw" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />
                  )}
                  <div className="absolute bottom-2 right-2">
                    <ScoreCircle score={song.displayScore} size={36} />
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 text-left">
                  <p className="font-bold text-sm text-slate-100 line-clamp-2 leading-tight">{song.title}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{song.artist}</p>
                  <p className="text-xs text-slate-600 mt-1 tabular-nums">ELO {song.elo}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-600 mb-6">Tap the song you prefer</p>

      {/* Skip */}
      <button
        onClick={() => pickPair(allRatings)}
        className="w-full py-3 rounded-2xl border border-white/10 text-xs font-semibold text-slate-500 hover:bg-white/5 transition-colors"
      >
        Skip this matchup
      </button>
    </div>
  );
}
