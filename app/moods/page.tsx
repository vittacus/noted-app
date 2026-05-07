"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  {
    tag: "Late Night",
    emoji: "🌙",
    gradient: "from-indigo-950 to-slate-900",
    border: "border-indigo-500/20",
    glow: "shadow-indigo-900/40",
  },
  {
    tag: "Workout",
    emoji: "💪",
    gradient: "from-orange-950 to-red-950",
    border: "border-orange-500/20",
    glow: "shadow-orange-900/40",
  },
  {
    tag: "Focus",
    emoji: "🧠",
    gradient: "from-teal-950 to-cyan-950",
    border: "border-teal-500/20",
    glow: "shadow-teal-900/40",
  },
  {
    tag: "Heartbreak",
    emoji: "💔",
    gradient: "from-rose-950 to-pink-950",
    border: "border-rose-500/20",
    glow: "shadow-rose-900/40",
  },
  {
    tag: "Hype",
    emoji: "🔥",
    gradient: "from-amber-950 to-yellow-950",
    border: "border-amber-500/20",
    glow: "shadow-amber-900/40",
  },
  {
    tag: "Road Trip",
    emoji: "🚗",
    gradient: "from-emerald-950 to-green-950",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-900/40",
  },
  {
    tag: "Chill",
    emoji: "🫶",
    gradient: "from-sky-950 to-blue-950",
    border: "border-sky-500/20",
    glow: "shadow-sky-900/40",
  },
  {
    tag: "Other",
    emoji: "🎵",
    gradient: "from-violet-950 to-purple-950",
    border: "border-violet-500/20",
    glow: "shadow-violet-900/40",
  },
] as const;

const MOOD_TAG_NAMES = MOODS.map((m) => m.tag);

export default function MoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("ratings")
        .select("best_for_tags")
        .eq("user_id", user.id);

      // Only count songs that match one of the 8 preset mood tags exactly
      const tally: Record<string, number> = {};
      for (const r of data ?? []) {
        for (const tag of r.best_for_tags ?? []) {
          if ((MOOD_TAG_NAMES as readonly string[]).includes(tag)) {
            tally[tag] = (tally[tag] ?? 0) + 1;
          }
        }
      }
      setCounts(tally);
      setLoading(false);
    }
    load();
  }, []);

  const visible = MOODS.filter((m) => (counts[m.tag] ?? 0) > 0);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="font-black text-2xl text-slate-100 mb-1">Moods</h1>
      <p className="text-sm text-slate-500 mb-6">Your songs by vibe</p>

      {visible.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎭</p>
          <p className="font-medium text-slate-400">No moods tagged yet</p>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            When you rate a song, use "Best for" tags to unlock this section
          </p>
          <Link href="/search" className="text-[#4fc3f7] text-sm font-semibold hover:underline">
            Rate a song →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {visible.map((m) => (
          <Link
            key={m.tag}
            href={`/moods/${encodeURIComponent(m.tag)}`}
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${m.gradient} border ${m.border} hover:brightness-110 transition-all shadow-lg ${m.glow} p-5 flex flex-col min-h-[130px]`}
          >
            <span className="text-3xl mb-auto">{m.emoji}</span>
            <div className="mt-3">
              <p className="font-bold text-slate-100 text-base leading-tight">{m.tag}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {counts[m.tag]} song{counts[m.tag] !== 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
