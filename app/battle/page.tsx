"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords, ArrowLeft, Flame, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ScoreCircle from "@/components/ScoreCircle";

interface BattleSong {
  ratingId: string;
  title: string;
  artist: string;
  albumArt: string | null;
  albumName: string;
  score: number;
}

export default function BattlePage() {
  const router = useRouter();
  const supabase = createClient();

  const [allRatings, setAllRatings] = useState<BattleSong[]>([]);
  const [pair, setPair] = useState<[BattleSong, BattleSong] | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [usedPairs, setUsedPairs] = useState<Set<string>>(new Set());
  const [battleCount, setBattleCount] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const MAX_BATTLES = 10;

  function pairKey(a: BattleSong, b: BattleSong) {
    return [a.ratingId, b.ratingId].sort().join("__");
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data, error } = await supabase
        .from("ratings")
        .select("id, overall_score, song:songs(id, title, artist, album_art_url, album_name)")
        .eq("user_id", user.id);

      if (error || !data) { setLoading(false); return; }

      const songs: BattleSong[] = (data as any[]).map((r) => ({
        ratingId: r.id,
        title: r.song?.title ?? "Unknown",
        artist: r.song?.artist ?? "",
        albumArt: r.song?.album_art_url ?? null,
        albumName: r.song?.album_name ?? "",
        score: r.overall_score ?? 5,
      }));

      setAllRatings(songs);
      setLoading(false);
    }
    load();
  }, []);

  const pickPair = useCallback((songs: BattleSong[], used: Set<string>, count: number) => {
    if (songs.length < 2 || count >= MAX_BATTLES) { setAllDone(true); setPair(null); return; }

    const sorted = [...songs].sort((a, b) => a.score - b.score);
    const closePairs: [BattleSong, BattleSong][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const key = pairKey(sorted[i], sorted[i + 1]);
      if (!used.has(key) && Math.abs(sorted[i].score - sorted[i + 1].score) <= 2.0) {
        closePairs.push([sorted[i], sorted[i + 1]]);
      }
    }
    // Fallback: any unused pair regardless of score distance
    const anyUnused: [BattleSong, BattleSong][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (!used.has(pairKey(sorted[i], sorted[j]))) anyUnused.push([sorted[i], sorted[j]]);
      }
    }
    const pool = closePairs.length > 0 ? closePairs : anyUnused;
    if (pool.length === 0) { setAllDone(true); setPair(null); return; }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setPair(Math.random() > 0.5 ? chosen : [chosen[1], chosen[0]]);
  }, []);

  useEffect(() => {
    if (!loading && allRatings.length >= 2) pickPair(allRatings, usedPairs, battleCount);
  }, [loading, allRatings]);

  async function handlePick(winner: BattleSong, loser: BattleSong) {
    if (selecting) return;
    setSelecting(true);

    // Nudge scores slightly: winner +0.1, loser -0.1, capped 1–10
    const newWinnerScore = Math.min(10, Math.round((winner.score + 0.1) * 10) / 10);
    const newLoserScore  = Math.max(1,  Math.round((loser.score  - 0.1) * 10) / 10);

    setAllRatings((prev) =>
      prev.map((s) => {
        if (s.ratingId === winner.ratingId) return { ...s, score: newWinnerScore };
        if (s.ratingId === loser.ratingId)  return { ...s, score: newLoserScore };
        return s;
      })
    );

    setLastResult(`${winner.title} wins!`);
    setStreak((s) => s + 1);

    const key = pairKey(winner, loser);
    const newUsed = new Set([...usedPairs, key]);
    const newCount = battleCount + 1;
    setUsedPairs(newUsed);
    setBattleCount(newCount);

    await Promise.all([
      supabase.from("ratings").update({ overall_score: newWinnerScore }).eq("id", winner.ratingId),
      supabase.from("ratings").update({ overall_score: newLoserScore  }).eq("id", loser.ratingId),
    ]);

    await new Promise((r) => setTimeout(r, 500));
    setLastResult(null);
    setSelecting(false);
    setAllRatings((current) => {
      pickPair(current, newUsed, newCount);
      return current;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allRatings.length < 2) {
    return (
      <div className="page-enter text-center py-20">
        <Swords size={40} className="text-[#8686AC]/75 mx-auto mb-4" />
        <p className="font-bold text-slate-100 text-lg mb-2">Not enough rated songs</p>
        <p className="text-[#8686AC] text-sm mb-6">Rate at least 2 songs to start battling</p>
        <Link href="/search" className="inline-block px-6 py-3 bg-[#4fa8ff]/80 text-white font-semibold rounded-2xl hover:bg-[#4fa8ff] transition-colors">
          Rate songs →
        </Link>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="page-enter text-center py-20">
        <div className="text-6xl mb-5">✅</div>
        <p className="font-black text-slate-100 mb-3" style={{ fontSize: 28 }}>
          All caught up!
        </p>
        <p className="text-white/70 mb-2" style={{ fontSize: 16 }}>
          {battleCount >= MAX_BATTLES
            ? `You've completed ${MAX_BATTLES} battles this session.`
            : "You've compared all similar songs in your library."}
        </p>
        <p className="text-sm text-[#8686AC] mb-10">Scores updated based on your picks.</p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => { setUsedPairs(new Set()); setBattleCount(0); setAllDone(false); pickPair(allRatings, new Set(), 0); }}
            className="px-8 py-3.5 bg-[#4fa8ff]/80 text-white font-bold rounded-2xl hover:bg-[#4fa8ff] transition-colors text-base">
            Battle again
          </button>
          <button
            onClick={() => router.push("/library")}
            className="px-8 py-3.5 border-2 border-[#8686AC]/40 text-white/80 font-semibold rounded-2xl hover:bg-[#505081]/30 hover:border-[#8686AC]/50 transition-colors text-base">
            Back to library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#505081]/20 border border-[#8686AC]/30 flex items-center justify-center hover:bg-[#505081]/30 transition-colors">
            <ArrowLeft size={16} className="text-[#8686AC]" />
          </button>
          <div>
            <h1 className="font-black text-xl text-slate-100 flex items-center gap-2">
              <Swords size={20} className="text-[#4fa8ff]" /> Battle mode
            </h1>
            <p className="text-xs text-[#8686AC]">Pick your preference — scores adjust live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-[#fb923c]/10 border border-[#fb923c]/20 px-3 py-1.5 rounded-full">
              <Flame size={14} className="text-[#fb923c]" />
              <span className="text-sm font-bold text-[#fb923c] tabular-nums">{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Last result flash */}
      {lastResult && (
        <div className="text-center mb-4">
          <p className="text-sm text-[#4ade80] font-semibold animate-pulse">{lastResult}</p>
        </div>
      )}

      {/* Battle cards */}
      {pair && (
        <div className="flex gap-3 mb-5">
          {pair.map((song, idx) => (
            <button key={song.ratingId} onClick={() => handlePick(song, pair[1 - idx]!)} disabled={selecting}
              className="flex-1 flex flex-col rounded-3xl border-2 border-[#8686AC]/30 bg-[#2D2D6B] overflow-hidden hover:border-[#4fa8ff]/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-60">
              <div className="relative w-full aspect-square bg-[#505081]/20">
                {song.albumArt
                  ? <Image src={song.albumArt} alt={song.albumName} fill className="object-cover" sizes="50vw" />
                  : <div className="w-full h-full bg-gradient-to-br from-[#0F0E47] to-[#1A1A4E]" />}
                <div className="absolute bottom-2 right-2">
                  <ScoreCircle score={song.score} size={32} />
                </div>
              </div>
              <div className="p-3 text-left">
                <p className="font-bold text-sm text-slate-100 line-clamp-2 leading-tight">{song.title}</p>
                <p className="text-xs text-[#8686AC] truncate mt-0.5">{song.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-[#8686AC]/75 mb-5">Tap the song you prefer</p>

      {/* Skip */}
      <button onClick={() => pickPair(allRatings, usedPairs, battleCount)} disabled={selecting}
        className="w-full py-3 rounded-2xl border border-[#8686AC]/30 text-xs font-semibold text-[#8686AC] hover:bg-[#505081]/20 transition-colors mb-3">
        Skip this matchup
      </button>
      <p className="text-center text-xs text-[#8686AC]/55 mb-3">{battleCount} of {MAX_BATTLES} battles</p>

      {/* Rerate a song */}
      <Link href="/search"
        className="w-full py-3 rounded-2xl border border-[#8686AC]/20 text-xs font-semibold text-[#8686AC]/75 hover:text-[#8686AC] transition-colors flex items-center justify-center gap-1.5">
        <RefreshCw size={12} /> Re-rate a song
      </Link>
    </div>
  );
}
