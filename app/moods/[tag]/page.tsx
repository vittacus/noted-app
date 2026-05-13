"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, X, Check, Trash2 } from "lucide-react";
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

  // ── Filter / sort state ────────────────────────────────────────────────────
  const [scoreFilter, setScoreFilter] = useState<"all" | "6+" | "7+" | "8+" | "9+">("all");
  const [sortMode, setSortMode] = useState<"top" | "recent">("top");
  const [artistFilter, setArtistFilter] = useState<string>("all");

  const SCORE_FILTERS = ["all", "6+", "7+", "8+", "9+"] as const;
  function minScore(f: typeof scoreFilter) { return f === "all" ? 0 : parseFloat(f); }

  // ── Swipe-to-delete state ─────────────────────────────────────────────────
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const touchRef = useRef<{ id: string; startX: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent, id: string) {
    touchRef.current = { id, startX: e.touches[0].clientX };
  }
  function handleTouchEnd(e: React.TouchEvent, id: string) {
    if (!touchRef.current || touchRef.current.id !== id) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    touchRef.current = null;
    if (dx < -55) {
      setOpenSwipeId(id);
    } else if (dx > 30 && openSwipeId === id) {
      setOpenSwipeId(null);
    } else if (Math.abs(dx) < 8 && openSwipeId && openSwipeId !== id) {
      setOpenSwipeId(null); // close other open card on tap elsewhere
    }
  }

  // ── Picker state ──────────────────────────────────────────────────────────
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
        .select("id, overall_score, best_for_tags, created_at, song:songs(id, title, artist, album_art_url, album_name)")
        .eq("user_id", user.id)
        .contains("best_for_tags", [moodName]);
      setSongs((data ?? []).sort((a: any, b: any) => b.overall_score - a.overall_score));
      setLoading(false);
    }
    load();
  }, [moodName]);

  // ── Remove from mood ──────────────────────────────────────────────────────
  async function removeFromMood(ratingId: string) {
    setRemovingId(ratingId);
    const rating = songs.find((r: any) => r.id === ratingId);
    if (rating) {
      const newTags = (rating.best_for_tags ?? []).filter((t: string) => t !== moodName);
      await supabase.from("ratings").update({ best_for_tags: newTags }).eq("id", ratingId);
    }
    setSongs((prev) => prev.filter((r: any) => r.id !== ratingId));
    setOpenSwipeId(null);
    setRemovingId(null);
  }

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
    setPickerSongs((data ?? []).filter((r: any) => !(r.best_for_tags ?? []).includes(moodName)));
    setPickerLoading(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function addToMood() {
    if (!selectedIds.size) return;
    setAdding(true);
    for (const ratingId of selectedIds) {
      const rating = pickerSongs.find((r: any) => r.id === ratingId);
      if (!rating) continue;
      await supabase.from("ratings").update({ best_for_tags: [...(rating.best_for_tags ?? []), moodName] }).eq("id", ratingId);
    }
    const added = pickerSongs.filter((r: any) => selectedIds.has(r.id));
    setSongs((prev) => [...prev, ...added].sort((a, b) => b.overall_score - a.overall_score));
    setPickerSongs((prev) => prev.filter((r: any) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setAdding(false);
    setShowPicker(false);
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" /></div>;
  }

  // ── Derived: unique artists (only show filter if 3+) ──────────────────────
  const distinctArtists = [...new Set(songs.map((r: any) => r.song?.artist).filter(Boolean))].sort();
  const showArtistFilter = distinctArtists.length >= 3;

  // ── Build filtered + sorted list ──────────────────────────────────────────
  let processed = songs.slice(); // copy
  if (scoreFilter !== "all") processed = processed.filter((r: any) => r.overall_score >= minScore(scoreFilter));
  if (artistFilter !== "all") processed = processed.filter((r: any) => r.song?.artist === artistFilter);
  if (sortMode === "top") {
    processed.sort((a: any, b: any) => b.overall_score - a.overall_score);
  } else {
    processed.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const displayed = showAll ? processed : processed.slice(0, 10);
  const hasMore = processed.length > 10;

  return (
    <div className="page-enter" onClick={() => { if (openSwipeId) setOpenSwipeId(null); }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#505081]/20 border border-[#8686AC]/30 flex items-center justify-center hover:bg-[#505081]/30 transition-colors shrink-0">
          <ArrowLeft size={16} className="text-[#8686AC]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-xl text-slate-100">{moodName}</h1>
          <p className="text-xs text-[#8686AC]">
            {processed.length}{processed.length !== songs.length ? ` of ${songs.length}` : ""} song{processed.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openPicker} className="w-9 h-9 rounded-full bg-[#4fa8ff]/10 border border-[#4fa8ff]/20 flex items-center justify-center hover:bg-[#4fa8ff]/20 transition-colors shrink-0">
          <Plus size={16} className="text-[#4fa8ff]" />
        </button>
      </div>

      {songs.length > 0 && (
        <>
          {/* Score threshold pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {SCORE_FILTERS.map((f) => (
              <button key={f} onClick={() => { setScoreFilter(f); setShowAll(false); }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  scoreFilter === f
                    ? "bg-[#4fa8ff] border-[#4fa8ff] text-[#0F0E47] shadow-md shadow-[#4fa8ff]/25"
                    : "bg-transparent border-[#8686AC]/40 text-[#8686AC] hover:border-white/40"
                }`}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div className="flex gap-1 bg-[#505081]/20 rounded-xl p-1 mb-3">
            {(["top", "recent"] as const).map((m) => (
              <button key={m} onClick={() => { setSortMode(m); setShowAll(false); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sortMode === m ? "bg-[#2D2D6B] text-[#4fa8ff] shadow-sm" : "text-[#8686AC] hover:text-slate-300"
                }`}>
                {m === "top" ? "Top rated" : "Recent"}
              </button>
            ))}
          </div>

          {/* Artist filter (only 3+ distinct artists) */}
          {showArtistFilter && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
              <button onClick={() => setArtistFilter("all")}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  artistFilter === "all"
                    ? "bg-[#4fa8ff]/20 border-[#4fa8ff]/60 text-[#4fa8ff]"
                    : "bg-transparent border-[#8686AC]/30 text-[#8686AC] hover:border-[#8686AC]/60"
                }`}>All Artists</button>
              {distinctArtists.map((artist: string) => (
                <button key={artist} onClick={() => setArtistFilter(artistFilter === artist ? "all" : artist)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    artistFilter === artist
                      ? "bg-[#4fa8ff]/20 border-[#4fa8ff]/60 text-[#4fa8ff]"
                      : "bg-transparent border-[#8686AC]/30 text-[#8686AC] hover:border-[#8686AC]/60"
                  }`}>
                  {artist.split(",")[0].trim()}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-medium text-[#8686AC]">No songs tagged with this mood</p>
          <p className="text-xs text-[#8686AC]/75 mt-2">Tap + to add songs from your library</p>
        </div>
      )}

      {processed.length === 0 && songs.length > 0 && (
        <div className="text-center py-10">
          <p className="font-medium text-[#8686AC]">No songs match these filters</p>
          <button onClick={() => { setScoreFilter("all"); setArtistFilter("all"); }}
            className="text-[#4fa8ff] text-xs font-semibold mt-2 hover:underline">Clear filters →</button>
        </div>
      )}

      {/* Song list — swipe-to-delete */}
      <div className="space-y-2 mb-4">
        {displayed.map((r: any, i) => {
          const isOpen = openSwipeId === r.id;
          const isRemoving = removingId === r.id;
          return (
            <div key={r.id}
              className={`relative overflow-hidden rounded-2xl transition-opacity duration-300 ${isRemoving ? "opacity-0" : "opacity-100"}`}>

              {/* Red delete action revealed on swipe */}
              <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex flex-col items-center justify-center gap-0.5 rounded-r-2xl">
                <button onClick={() => removeFromMood(r.id)} className="flex flex-col items-center gap-0.5 w-full h-full justify-center active:bg-red-600 transition-colors">
                  <Trash2 size={16} className="text-white" />
                  <span className="text-white text-[10px] font-semibold">Remove</span>
                </button>
              </div>

              {/* Card — slides left to reveal delete; navigates to song on tap */}
              <div
                className={`relative z-10 bg-[#2D2D6B] border border-[#8686AC]/20 rounded-2xl transition-transform duration-200 ease-out group ${
                  isOpen ? "-translate-x-20" : "translate-x-0"
                }`}
                onTouchStart={(e) => handleTouchStart(e, r.id)}
                onTouchEnd={(e) => handleTouchEnd(e, r.id)}
                onClick={(e) => {
                  if (isOpen) { e.preventDefault(); setOpenSwipeId(null); return; }
                  router.push(`/song/${r.id}`);
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  <span className="text-sm font-black text-[#8686AC]/55 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#505081]/20 shrink-0">
                    {r.song?.album_art_url
                      ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#0F0E47] to-[#1A1A4E]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
                    <p className="text-xs text-[#8686AC] truncate">{r.song?.artist}</p>
                  </div>
                  {/* Desktop hover × button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromMood(r.id); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-all shrink-0 mr-1"
                    title="Remove from mood"
                  >
                    <X size={12} className="text-red-400" />
                  </button>
                  <ScoreCircle score={r.overall_score} size={40} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button onClick={() => setShowAll((v) => !v)}
          className="w-full py-2.5 rounded-2xl border border-[#8686AC]/30 text-xs font-semibold text-[#8686AC] hover:bg-[#505081]/20 transition-colors mb-4">
          {showAll ? "Show top 10 only" : `See all ${processed.length} songs →`}
        </button>
      )}

      {/* Export placeholder */}
      <div className="relative">
        <button disabled
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
          className="w-full py-3 rounded-2xl border border-[#8686AC]/30 text-[#8686AC]/75 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 opacity-50">
          🎵 Export to Spotify playlist
        </button>
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#2D2D6B] border border-[#8686AC]/30 rounded-xl text-xs text-[#8686AC] whitespace-nowrap shadow-lg pointer-events-none">
            Coming soon — connect your Spotify account to enable this
          </div>
        )}
      </div>

      {/* Add songs picker sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end" style={{ isolation: "isolate" }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowPicker(false); setSelectedIds(new Set()); }} />
          <div className="relative w-full bg-[#1A1A4E] rounded-t-3xl flex flex-col"
            style={{ maxHeight: "80vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}>
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#505081]/50" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-[#8686AC]/20 shrink-0">
              <div>
                <h3 className="font-bold text-slate-100">Add to {moodName}</h3>
                <p className="text-xs text-[#8686AC] mt-0.5">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap songs to select"}
                </p>
              </div>
              <button onClick={() => { setShowPicker(false); setSelectedIds(new Set()); }}
                className="w-8 h-8 rounded-full bg-[#505081]/30 flex items-center justify-center hover:bg-[#505081]/50 transition-colors">
                <X size={14} className="text-[#8686AC]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
              {pickerLoading && <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" /></div>}
              {!pickerLoading && pickerSongs.length === 0 && (
                <p className="text-center text-[#8686AC]/75 text-sm py-10">All your rated songs are already in this mood 🎉</p>
              )}
              {pickerSongs.map((r: any) => {
                const sel = selectedIds.has(r.id);
                return (
                  <button key={r.id} onClick={() => toggleSelect(r.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3 border transition-all text-left ${
                      sel ? "border-[#4fa8ff]/40 bg-[#4fa8ff]/5" : "border-[#8686AC]/20 bg-[#505081]/20 hover:border-[#8686AC]/30"
                    }`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-[#4fa8ff] border-[#4fa8ff]" : "border-[#8686AC]/50"}`}>
                      {sel && <Check size={11} className="text-[#0F0E47]" strokeWidth={3} />}
                    </div>
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#505081]/20 shrink-0">
                      {r.song?.album_art_url
                        ? <Image src={r.song.album_art_url} alt="" fill className="object-cover" sizes="40px" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#0F0E47] to-[#1A1A4E]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
                      <p className="text-xs text-[#8686AC] truncate">{r.song?.artist}</p>
                    </div>
                    <ScoreCircle score={r.overall_score} size={34} />
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-8 pt-3 border-t border-[#8686AC]/20 shrink-0 bg-[#1A1A4E]">
              <button onClick={addToMood} disabled={!selectedIds.size || adding}
                className={`w-full h-12 rounded-2xl font-semibold text-sm transition-all ${
                  selectedIds.size > 0 && !adding
                    ? "bg-[#4fa8ff]/80 text-white hover:bg-[#4fa8ff]"
                    : "bg-[#505081]/20 text-[#8686AC]/75 cursor-not-allowed"
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
