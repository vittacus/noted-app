"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PRESET_MOODS = [
  { tag: "Late Night", emoji: "🌙", gradient: "from-indigo-950 to-slate-900",   border: "border-indigo-500/20" },
  { tag: "Workout",    emoji: "💪", gradient: "from-orange-950 to-red-950",      border: "border-orange-500/20" },
  { tag: "Focus",      emoji: "🧠", gradient: "from-teal-950 to-cyan-950",       border: "border-teal-500/20"   },
  { tag: "Heartbreak", emoji: "💔", gradient: "from-rose-950 to-pink-950",       border: "border-rose-500/20"   },
  { tag: "Hype",       emoji: "🔥", gradient: "from-amber-950 to-yellow-950",    border: "border-amber-500/20"  },
  { tag: "Road Trip",  emoji: "🚗", gradient: "from-emerald-950 to-green-950",   border: "border-emerald-500/20"},
  { tag: "Chill",      emoji: "🫶", gradient: "from-sky-950 to-blue-950",        border: "border-sky-500/20"    },
  { tag: "Other",      emoji: "🎵", gradient: "from-violet-950 to-purple-950",   border: "border-violet-500/20" },
];
const PRESET_NAMES = new Set(PRESET_MOODS.map((m) => m.tag));

interface MoodCard {
  tag: string;
  allCount: number;
  topCount: number;
  previews: string[];      // top 3 album art urls from highest-scored songs
  topPreviews: string[];   // same but only for 7+
  isPreset: boolean;
}

export default function MoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [moodCards, setMoodCards] = useState<MoodCard[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "top">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("ratings")
        .select("overall_score, best_for_tags, song:songs(album_art_url)")
        .eq("user_id", user.id)
        .order("overall_score", { ascending: false });

      // Build map of tag → songs (sorted by score desc, already ordered)
      const tagMap = new Map<string, { score: number; art: string | null }[]>();
      for (const r of data ?? []) {
        for (const tag of r.best_for_tags ?? []) {
          if (!tagMap.has(tag)) tagMap.set(tag, []);
          tagMap.get(tag)!.push({ score: r.overall_score, art: (r.song as any)?.album_art_url ?? null });
        }
      }

      // Build cards: presets first (in order), then custom tags
      const cards: MoodCard[] = [];
      const seen = new Set<string>();

      // Preset moods
      for (const m of PRESET_MOODS) {
        const songs = tagMap.get(m.tag) ?? [];
        if (songs.length === 0) continue;
        seen.add(m.tag);
        const topSongs = songs.filter((s) => s.score >= 7.0);
        cards.push({
          tag: m.tag,
          allCount: songs.length,
          topCount: topSongs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          topPreviews: topSongs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: true,
        });
      }

      // Custom tags
      for (const [tag, songs] of tagMap.entries()) {
        if (seen.has(tag)) continue;
        const topSongs = songs.filter((s) => s.score >= 7.0);
        cards.push({
          tag,
          allCount: songs.length,
          topCount: topSongs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          topPreviews: topSongs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: false,
        });
      }

      setMoodCards(cards);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const visibleCards = moodCards.filter((c) =>
    filterMode === "all" ? c.allCount > 0 : c.topCount > 0
  );

  return (
    <div className="page-enter">
      <h1 className="font-black text-2xl text-slate-100 mb-1">Moods</h1>
      <p className="text-sm text-slate-500 mb-4">Your songs by vibe</p>

      {/* Filter toggle */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-6">
        <button onClick={() => setFilterMode("all")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            filterMode === "all" ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm" : "text-slate-500 hover:text-slate-300"
          }`}>All rated</button>
        <button onClick={() => setFilterMode("top")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            filterMode === "top" ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm" : "text-slate-500 hover:text-slate-300"
          }`}>Top rated only (7+)</button>
      </div>

      {visibleCards.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎭</p>
          <p className="font-medium text-slate-400">
            {filterMode === "top" ? "No songs rated 7+ with mood tags yet" : "No moods tagged yet"}
          </p>
          <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline mt-2 block">
            Rate a song →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {visibleCards.map((card) => {
          const preset = PRESET_MOODS.find((m) => m.tag === card.tag);
          const count = filterMode === "all" ? card.allCount : card.topCount;
          const previews = filterMode === "all" ? card.previews : card.topPreviews;

          return (
            <Link
              key={card.tag}
              href={`/moods/${encodeURIComponent(card.tag)}`}
              className={`relative rounded-3xl overflow-hidden border hover:brightness-110 transition-all min-h-[140px] flex flex-col ${
                preset
                  ? `bg-gradient-to-br ${preset.gradient} ${preset.border}`
                  : "bg-[#1e2d3d] border-white/10"
              }`}
            >
              {/* Album art preview grid */}
              {previews.length > 0 && (
                <div className="absolute inset-0 opacity-30">
                  <div className={`grid h-full ${previews.length === 1 ? "grid-cols-1" : previews.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {previews.map((art, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <Image src={art} alt="" fill className="object-cover" sizes="80px" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative p-4 flex flex-col flex-1">
                <span className="text-2xl mb-auto">{preset?.emoji ?? "🎵"}</span>
                <div className="mt-3">
                  <p className="font-bold text-slate-100 text-sm leading-tight">{card.tag}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{count} song{count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
