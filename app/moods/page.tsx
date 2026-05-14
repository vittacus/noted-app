"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PRESET_MOODS = [
  { tag: "Late Night", emoji: "🌙", gradient: "from-indigo-950 to-slate-900",    border: "border-indigo-500/20"  },
  { tag: "Workout",    emoji: "💪", gradient: "from-orange-950 to-red-950",       border: "border-orange-500/20"  },
  { tag: "Focus",      emoji: "🧠", gradient: "from-teal-950 to-cyan-950",        border: "border-teal-500/20"    },
  { tag: "Heartbreak", emoji: "💔", gradient: "from-rose-950 to-pink-950",        border: "border-rose-500/20"    },
  { tag: "Hype",       emoji: "🔥", gradient: "from-amber-950 to-yellow-950",     border: "border-amber-500/20"   },
  { tag: "Road Trip",  emoji: "🚗", gradient: "from-emerald-950 to-green-950",    border: "border-emerald-500/20" },
  { tag: "Chill",      emoji: "🫶", gradient: "from-sky-950 to-blue-950",         border: "border-sky-500/20"     },
  { tag: "Other",      emoji: "🎵", gradient: "from-violet-950 to-purple-950",    border: "border-violet-500/20"  },
];

interface MoodCard {
  tag: string;
  count: number;
  previews: string[];
  isPreset: boolean;
}

export default function MoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [moodCards, setMoodCards] = useState<MoodCard[]>([]);
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

      const tagMap = new Map<string, { score: number; art: string | null }[]>();
      for (const r of data ?? []) {
        for (const tag of r.best_for_tags ?? []) {
          if (!tagMap.has(tag)) tagMap.set(tag, []);
          tagMap.get(tag)!.push({ score: r.overall_score, art: (r.song as any)?.album_art_url ?? null });
        }
      }

      const cards: MoodCard[] = [];
      const seen = new Set<string>();

      for (const m of PRESET_MOODS) {
        const songs = tagMap.get(m.tag) ?? [];
        if (songs.length === 0) continue;
        seen.add(m.tag);
        cards.push({
          tag: m.tag,
          count: songs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: true,
        });
      }

      for (const [tag, songs] of tagMap.entries()) {
        if (seen.has(tag)) continue;
        cards.push({
          tag,
          count: songs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: false,
        });
      }

      setMoodCards(cards);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (moodCards.length === 0) {
    return (
      <div className="page-enter text-center py-16">
        <p className="text-4xl mb-3">🎭</p>
        <p className="font-medium text-white/50">No moods tagged yet</p>
        <Link href="/search" className="text-[#4fa8ff] text-sm font-semibold hover:underline mt-2 block">Rate a song →</Link>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="font-black text-2xl text-slate-100 mb-1">Moods</h1>
      <p className="text-sm text-white/50 mb-5">Your songs by vibe</p>

      <div className="grid grid-cols-2 gap-3">
        {moodCards.map((card) => {
          const preset = PRESET_MOODS.find((m) => m.tag === card.tag);
          return (
            <Link
              key={card.tag}
              href={`/moods/${encodeURIComponent(card.tag)}`}
              className={`relative rounded-3xl overflow-hidden border hover:brightness-110 transition-all min-h-[140px] flex flex-col ${
                preset
                  ? `bg-gradient-to-br ${preset.gradient} ${preset.border}`
                  : "bg-[#1A1A1A] border-white/10"
              }`}
            >
              {card.previews.length > 0 && (
                <div className="absolute inset-0 opacity-30">
                  <div className={`grid h-full ${card.previews.length === 1 ? "grid-cols-1" : card.previews.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {card.previews.map((art, i) => (
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
                  <p className="text-xs text-white/50 mt-0.5">{card.count} song{card.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
