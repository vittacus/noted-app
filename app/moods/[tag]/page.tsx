"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ScoreCircle from "@/components/ScoreCircle";

export default function MoodDetailPage() {
  const { tag } = useParams<{ tag: string }>();
  const moodName = decodeURIComponent(tag);
  const router = useRouter();
  const supabase = createClient();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<"all" | "6+" | "7+" | "8+" | "9+">("all");

  const SCORE_FILTERS = ["all", "6+", "7+", "8+", "9+"] as const;

  function minScore(f: typeof scoreFilter): number {
    if (f === "all") return 0;
    return parseFloat(f);
  }

  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSongs, setPickerSongs] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("ratings")
        .select("id, overall_score, best_for_tags, song:songs(id, title, artist, album_art_url, album_name)")
        .eq("user_id", user.id)
        .contains("best_for_tags", [moodName]);

      setSongs((data ?? []).sort((a: any, b: any) => b.overall_score - a.overall_score));
      setLoading(false);
    }
    load();
  }, [moodName]);

  async function openPicker() {
    setShowPicker(true);
    setPickerLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPickerLoading(false); return; }

    const { data } = await supabase
      .from("ratings")
      .select("id, overall_score, best_for_tags, song:songs(id, title, artist, album_art_url)")
      .eq("user_id", user.id)
      .order("overall_score", { ascending: false });

    // Client-side filter: exclude songs that already have this mood tag
    const untagged = (data ?? []).filter((r: any) =>
      !(r.best_for_tags ?? []).includes(moodName)
    );
    setPickerSongs(untagged);
    setPickerLoading(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function addToMood() {
    if (selectedIds.size === 0) return;
    setAdding(true);

    for (const ratingId of selectedIds) {
      const rating = pickerSongs.find((r: any) => r.id === ratingId);
      if (!rating) continue;
      const newTags = [...(rating.best_for_tags ?? []), moodName];
      await supabase.from("ratings").update({ best_for_tags: newTags }).eq("id", ratingId);
    }

    // Merge added songs into the main list and re-sort
    const added = pickerSongs.filter((r: any) => selectedIds.has(r.id));
    setSongs((prev) => [...prev, ...added].sort((a, b) => b.overall_score - a.overall_score));
    setPickerSongs((prev) => prev.filter((r: any) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setAdding(false);
    setShowPicker(false);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filteredSongs = scoreFilter === "all"
    ? songs
    : songs.filter((r: any) => r.overall_score >= minScore(scoreFilter));
  const displayed = showAll ? filteredSongs : filteredSongs.slice(0, 10);
  const hasMore = filteredSongs.length > 10;

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={16} className="text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-xl text-slate-100">{moodName}</h1>
          <p className="text-xs text-slate-500">
            {filteredSongs.length}{scoreFilter !== "all" ? ` of ${songs.length}` : ""} song{filteredSongs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openPicker}
          className="w-9 h-9 rounded-full bg-[#4fc3f7]/10 border border-[#4fc3f7]/20 flex items-center justify-center hover:bg-[#4fc3f7]/20 transition-colors shrink-0"
        >
          <Plus size={16} className="text-[#4fc3f7]" />
        </button>
      </div>

      {/* Score filter pills */}
      {songs.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {SCORE_FILTERS.map((f) => {
            const active = scoreFilter === f;
            return (
              <button
                key={f}
                onClick={() => { setScoreFilter(f); setShowAll(false); }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? "bg-[#4fc3f7] border-[#4fc3f7] text-[#0d1f35] shadow-md shadow-[#4fc3f7]/25"
                    : "bg-transparent border-white/20 text-slate-400 hover:border-white/40"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            );
          })}
        </div>
      )}

      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-medium text-slate-400">No songs tagged with this mood</p>
          <p className="text-xs text-slate-600 mt-2">Tap + to add songs from your library</p>
        </div>
      )}

      {filteredSongs.length === 0 && songs.length > 0 && (
        <div className="text-center py-10">
          <p className="font-medium text-slate-500">No {moodName} songs rated {scoreFilter}</p>
          <button onClick={() => setScoreFilter("all")} className="text-[#4fc3f7] text-xs font-semibold mt-2 hover:underline">Show all →</button>
        </div>
      )}

      {/* Song list */}
      <div className="space-y-2 mb-4">
        {displayed.map((r: any, i) => (
          <Link key={r.id} href={`/song/${r.id}`} className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block">
            <span className="text-sm font-black text-slate-700 w-5 text-right shrink-0">{i + 1}</span>
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {r.song?.album_art_url
                ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
              <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
            </div>
            <ScoreCircle score={r.overall_score} size={40} />
          </Link>
        ))}
      </div>

      {hasMore && (
        <button onClick={() => setShowAll((v) => !v)}
          className="w-full py-2.5 rounded-2xl border border-white/10 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors mb-4">
          {showAll ? "Show top 10 only" : `See all ${songs.length} songs →`}
        </button>
      )}

      {/* Export placeholder */}
      <div className="relative">
        <button disabled
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
          className="w-full py-3 rounded-2xl border border-white/10 text-slate-600 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 opacity-50">
          🎵 Export to Spotify playlist
        </button>
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1e2d3d] border border-white/10 rounded-xl text-xs text-slate-400 whitespace-nowrap shadow-lg pointer-events-none">
            Coming soon — connect your Spotify account to enable this
          </div>
        )}
      </div>

      {/* Add songs picker — full bottom sheet above all content */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
          style={{ isolation: "isolate" }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowPicker(false); setSelectedIds(new Set()); }}
          />

          {/* Sheet */}
          <div className="relative w-full bg-[#1a2332] rounded-t-3xl flex flex-col"
            style={{ maxHeight: "80vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Picker header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/5 shrink-0">
              <div>
                <h3 className="font-bold text-slate-100">Add to {moodName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap songs to select"}
                </p>
              </div>
              <button onClick={() => { setShowPicker(false); setSelectedIds(new Set()); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Song list — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
              {pickerLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!pickerLoading && pickerSongs.length === 0 && (
                <p className="text-center text-slate-600 text-sm py-10">
                  All your rated songs are already in this mood 🎉
                </p>
              )}
              {pickerSongs.map((r: any) => {
                const sel = selectedIds.has(r.id);
                return (
                  <button key={r.id} onClick={() => toggleSelect(r.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3 border transition-all text-left ${
                      sel ? "border-[#4fc3f7]/40 bg-[#4fc3f7]/5" : "border-white/5 bg-white/5 hover:border-white/10"
                    }`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      sel ? "bg-[#4fc3f7] border-[#4fc3f7]" : "border-white/25"
                    }`}>
                      {sel && <Check size={11} className="text-[#0d1f35]" strokeWidth={3} />}
                    </div>
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                      {r.song?.album_art_url
                        ? <Image src={r.song.album_art_url} alt="" fill className="object-cover" sizes="40px" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
                      <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
                    </div>
                    <ScoreCircle score={r.overall_score} size={34} />
                  </button>
                );
              })}
            </div>

            {/* Confirm — sticky at bottom of sheet */}
            <div className="px-5 pb-8 pt-3 border-t border-white/5 shrink-0 bg-[#1a2332]">
              <button onClick={addToMood}
                disabled={selectedIds.size === 0 || adding}
                className={`w-full h-12 rounded-2xl font-semibold text-sm transition-all ${
                  selectedIds.size > 0 && !adding
                    ? "bg-[#4fc3f7]/80 text-white hover:bg-[#4fc3f7]"
                    : "bg-white/5 text-slate-600 cursor-not-allowed"
                }`}>
                {adding ? "Adding…" : selectedIds.size > 0
                  ? `Add ${selectedIds.size} song${selectedIds.size !== 1 ? "s" : ""} to ${moodName}`
                  : "Select songs to add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
