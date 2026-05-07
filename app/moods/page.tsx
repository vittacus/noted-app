"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BEST_FOR_TAGS } from "@/types";

const PRESET_EMOJIS: Record<string, string> = {
  "Late Night": "🌙",
  "Workout":    "💪",
  "Focus":      "🧠",
  "Heartbreak": "💔",
  "Hype":       "🔥",
  "Road Trip":  "🚗",
};

const PRESET_COLORS: Record<string, string> = {
  "Late Night": "from-indigo-900/60 to-[#1e2d3d]",
  "Workout":    "from-orange-900/60 to-[#1e2d3d]",
  "Focus":      "from-cyan-900/60 to-[#1e2d3d]",
  "Heartbreak": "from-rose-900/60 to-[#1e2d3d]",
  "Hype":       "from-amber-900/60 to-[#1e2d3d]",
  "Road Trip":  "from-emerald-900/60 to-[#1e2d3d]",
};

export default function MoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [moodCounts, setMoodCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("ratings")
        .select("best_for_tags")
        .eq("user_id", user.id);

      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        for (const tag of r.best_for_tags ?? []) {
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      }
      setMoodCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Preset moods first, then any custom vibes not in the preset list
  const presets = BEST_FOR_TAGS.filter((t) => moodCounts[t] > 0);
  const customVibes = Object.keys(moodCounts).filter(
    (t) => !(BEST_FOR_TAGS as readonly string[]).includes(t) && moodCounts[t] > 0
  );

  const allEmpty = presets.length === 0 && customVibes.length === 0;

  return (
    <div className="page-enter">
      <h1 className="font-black text-2xl text-slate-100 mb-1">Moods</h1>
      <p className="text-sm text-slate-500 mb-6">Your songs by vibe</p>

      {allEmpty && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎭</p>
          <p className="font-medium text-slate-400">No moods yet</p>
          <p className="text-xs text-slate-600 mt-1 mb-4">Tag songs with moods when you rate them</p>
          <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline">Rate a song →</Link>
        </div>
      )}

      {/* Preset moods grid */}
      {presets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {presets.map((tag) => (
            <Link
              key={tag}
              href={`/moods/${encodeURIComponent(tag)}`}
              className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${PRESET_COLORS[tag] ?? "from-slate-800 to-[#1e2d3d]"} border border-white/5 hover:border-white/15 transition-colors p-5 flex flex-col`}
            >
              <span className="text-3xl mb-3">{PRESET_EMOJIS[tag] ?? "🎵"}</span>
              <p className="font-bold text-slate-100 text-base">{tag}</p>
              <p className="text-xs text-slate-400 mt-0.5">{moodCounts[tag]} song{moodCounts[tag] !== 1 ? "s" : ""}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Custom vibes */}
      {customVibes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Custom vibes</p>
          <div className="flex flex-wrap gap-2">
            {customVibes.map((tag) => (
              <Link
                key={tag}
                href={`/moods/${encodeURIComponent(tag)}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1e2d3d] border border-white/5 hover:border-white/15 rounded-2xl transition-colors"
              >
                <span className="text-sm font-semibold text-slate-200">{tag}</span>
                <span className="text-xs text-slate-500">{moodCounts[tag]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
