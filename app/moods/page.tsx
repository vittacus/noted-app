"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PRESET_MOODS = [
  { tag: "Late Night", emoji: "🌙", gradient: "from-indigo-900 to-black",        border: "border-indigo-500/25"  },
  { tag: "Workout",    emoji: "💪", gradient: "from-red-900 to-orange-800",       border: "border-red-500/25"     },
  { tag: "Focus",      emoji: "🧠", gradient: "from-teal-800 to-slate-900",       border: "border-teal-500/25"    },
  { tag: "Heartbreak", emoji: "💔", gradient: "from-rose-900 to-pink-950",        border: "border-rose-500/25"    },
  { tag: "Hype",       emoji: "🔥", gradient: "from-amber-700 to-orange-900",     border: "border-amber-500/25"   },
  { tag: "Road Trip",  emoji: "🚗", gradient: "from-emerald-800 to-teal-900",     border: "border-emerald-500/25" },
  { tag: "Chill",      emoji: "🫶", gradient: "from-sky-800 to-indigo-900",       border: "border-sky-500/25"     },
  { tag: "Other",      emoji: "🎵", gradient: "from-slate-700 to-slate-950",      border: "border-slate-500/25"   },
];

// Rotating gradients for custom moods — assigned deterministically from tag string
const CUSTOM_GRADIENTS = [
  { gradient: "from-purple-800 to-violet-950",   border: "border-purple-500/25"  },
  { gradient: "from-cyan-800 to-blue-900",        border: "border-cyan-500/25"    },
  { gradient: "from-fuchsia-700 to-purple-900",   border: "border-fuchsia-500/25" },
  { gradient: "from-yellow-700 to-amber-900",     border: "border-yellow-500/25"  },
  { gradient: "from-lime-800 to-emerald-900",     border: "border-lime-500/25"    },
  { gradient: "from-pink-800 to-rose-950",        border: "border-pink-500/25"    },
];

function customGradient(tag: string) {
  const idx = tag.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % CUSTOM_GRADIENTS.length;
  return CUSTOM_GRADIENTS[idx];
}

const PRESET_EMOJIS = [
  "🎸","🎹","🎺","🎷","🥁","🎻","🎵","🎶",
  "✨","🌊","🌿","☀️","❄️","🌙","🔥","💫",
  "🎉","🧘","🏃","📚","🎮","🌸","🎭","🌃",
];

const CUSTOM_MOODS_KEY = "noted_custom_moods";

interface CustomMoodDef { tag: string; emoji: string; }

interface MoodCard {
  tag: string;
  count: number;
  previews: string[];
  isPreset: boolean;
  emoji?: string;
}

export default function MoodsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [moodCards, setMoodCards] = useState<MoodCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMoodDefs, setCustomMoodDefs] = useState<CustomMoodDef[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎸");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      let customDefs: CustomMoodDef[] = [];
      try {
        const stored = localStorage.getItem(CUSTOM_MOODS_KEY);
        if (stored) customDefs = JSON.parse(stored);
      } catch {}
      setCustomMoodDefs(customDefs);

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
          tag: m.tag, count: songs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: true,
        });
      }

      for (const [tag, songs] of tagMap.entries()) {
        if (seen.has(tag)) continue;
        const customDef = customDefs.find((d) => d.tag === tag);
        seen.add(tag);
        cards.push({
          tag, count: songs.length,
          previews: songs.slice(0, 3).map((s) => s.art).filter(Boolean) as string[],
          isPreset: false, emoji: customDef?.emoji,
        });
      }

      for (const def of customDefs) {
        if (seen.has(def.tag)) continue;
        cards.push({ tag: def.tag, count: 0, previews: [], isPreset: false, emoji: def.emoji });
      }

      setMoodCards(cards);
      setLoading(false);
    }
    load();
  }, []);

  function createMood() {
    const name = newName.trim();
    if (!name) return;
    const def: CustomMoodDef = { tag: name, emoji: newEmoji };
    const newDefs = [...customMoodDefs, def];
    setCustomMoodDefs(newDefs);
    try { localStorage.setItem(CUSTOM_MOODS_KEY, JSON.stringify(newDefs)); } catch {}
    setMoodCards((prev) => [...prev, { tag: name, count: 0, previews: [], isPreset: false, emoji: newEmoji }]);
    setShowCreate(false);
    setNewName("");
    setNewEmoji("🎸");
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="page-enter">
      <h1 className="font-black text-2xl text-slate-100 mb-1">Moods</h1>
      <p className="text-sm text-white/50 mb-5">Your songs by vibe</p>

      {moodCards.length === 0 && (
        <div className="text-center py-16 mb-4">
          <p className="text-4xl mb-3">🎭</p>
          <p className="font-medium text-white/50">No moods tagged yet</p>
          <Link href="/search" className="text-[#F5A623] text-sm font-semibold hover:underline mt-2 block">Rate a song →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {moodCards.map((card) => {
          const preset = PRESET_MOODS.find((m) => m.tag === card.tag);
          const { gradient, border } = preset ?? customGradient(card.tag);
          const emoji = preset?.emoji ?? card.emoji ?? "🎵";

          return (
            <Link
              key={card.tag}
              href={`/moods/${encodeURIComponent(card.tag)}`}
              className={`relative rounded-3xl overflow-hidden border hover:brightness-110 transition-all min-h-[140px] flex flex-col bg-gradient-to-br ${gradient} ${border}`}
            >
              <div className="relative p-4 flex flex-col flex-1">
                {/* Emoji with dark backing chip */}
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-xl shrink-0">
                  {emoji}
                </span>

                <div className="flex-1" />

                {/* Compact thumbnail strip — up to 3 small squares, not stretched */}
                {card.previews.length > 0 && (
                  <div className="flex gap-1.5 mb-2.5">
                    {card.previews.slice(0, 3).map((art, i) => (
                      <div key={i} className="relative w-7 h-7 rounded-md overflow-hidden border border-white/25 shrink-0">
                        <Image src={art} alt="" fill className="object-cover" sizes="28px" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Name + count */}
                <div>
                  <p className="font-bold text-white text-sm leading-tight">{card.tag}</p>
                  <p className="text-xs text-white/55 mt-0.5">{card.count} song{card.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Create Mood card */}
        <button
          onClick={() => setShowCreate(true)}
          className="relative rounded-3xl border-2 border-dashed border-white/20 min-h-[140px] flex flex-col items-center justify-center gap-2 hover:border-white/35 hover:bg-white/5 transition-all"
        >
          <span className="text-2xl text-white/35">+</span>
          <p className="text-sm font-semibold text-white/40">Create mood</p>
        </button>
      </div>

      {/* Create Mood modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111111] rounded-3xl border border-white/10 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-100">New mood</h2>

            <div>
              <label className="text-xs font-semibold text-white/38 uppercase tracking-wide block mb-2">Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createMood()}
                placeholder="e.g. Sunday Morning"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-white/28 focus:outline-none focus:border-[#F5A623]/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/38 uppercase tracking-wide block mb-2">Icon</label>
              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewEmoji(e)}
                    className={`h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      newEmoji === e
                        ? "bg-[#F5A623]/20 ring-2 ring-[#F5A623]/60"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowCreate(false); setNewName(""); setNewEmoji("🎸"); }}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-sm font-semibold text-white/50 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createMood}
                disabled={!newName.trim()}
                className="flex-1 py-3 rounded-2xl bg-[#F5A623] text-black font-bold text-sm disabled:opacity-40 hover:bg-[#d4891a] transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
