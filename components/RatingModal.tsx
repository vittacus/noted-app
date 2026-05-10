"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import ScoreCircle from "@/components/ScoreCircle";
import { SpotifyTrack, VibeOption, RatingFormState, BEST_FOR_TAGS, GENRE_TAGS } from "@/types";
import { scoreColor, calculateScore } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Steps: 1=Vibe  2=Dimensions  3=Tags  4=Reveal+Save

interface RatingModalProps {
  track: SpotifyTrack;
  onClose: () => void;
  onSaved: () => void;
}

const vibeOptions: { key: VibeOption; label: string; emoji: string }[] = [
  { key: "loved",      label: "I loved it",       emoji: "🔥" },
  { key: "liked",      label: "I liked it",        emoji: "👍" },
  { key: "didnt_like", label: "I didn't like it",  emoji: "😐" },
];

const DIMENSION_META = [
  { field: "replay_value" as const, label: "Replay Value", description: "How much do you want to hear it again?" },
  { field: "lyrics"       as const, label: "Lyrics",       description: "Does the writing hit?"                  },
  { field: "production"   as const, label: "Production",   description: "How does it sound?"                     },
];

const DIM_COLORS: Record<string, string> = {
  replay_value: "#4fc3f7",
  lyrics:       "#a78bfa",
  production:   "#fb923c",
};

function RatingCircleRow({ label, description, value, color, onChange }: {
  label: string; description: string; value: number | null; color: string; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-7">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="text-sm font-semibold" style={{ color }}>{label}</span>
          <p className="text-xs italic text-slate-600 mt-0.5">{description}</p>
        </div>
        <span className="text-sm font-bold mt-0.5 shrink-0 tabular-nums" style={{ color }}>
          {value ?? "—"}
        </span>
      </div>
      <div className="flex gap-1.5 justify-between mt-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const sel = value === n;
          return (
            <button key={n} onClick={() => onChange(n)}
              className={`rating-circle w-8 h-8 rounded-full text-xs font-bold border flex items-center justify-center transition-all ${
                sel ? "text-white selected shadow-md" : "bg-white/5 border-white/10 text-slate-500 hover:text-white"
              }`}
              style={sel ? { backgroundColor: color, borderColor: color } : undefined}
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
}

interface CompSong { ratingId: string; title: string; artist: string; albumArt: string | null; score: number; }

export default function RatingModal({ track, onClose, onSaved }: RatingModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Head-to-head comparison state
  const [librarySongs, setLibrarySongs] = useState<CompSong[]>([]);
  const [compCandidates, setCompCandidates] = useState<CompSong[]>([]);
  const [compRoundIdx, setCompRoundIdx] = useState(0);
  const [compResults, setCompResults] = useState<("won"|"lost"|"skipped")[]>([]);

  // Inline "Other" expansion and mood-list checkboxes
  const [otherVibeText, setOtherVibeText] = useState("");
  const [moodCheckboxes, setMoodCheckboxes] = useState<Set<string>>(new Set());
  const [customMoodEntries, setCustomMoodEntries] = useState<string[]>([]);
  const [customMoodInput, setCustomMoodInput] = useState("");

  function toggleMoodCheckbox(name: string) {
    setMoodCheckboxes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function addCustomMoodEntry() {
    const name = customMoodInput.trim();
    if (!name || customMoodEntries.includes(name)) return;
    setCustomMoodEntries((prev) => [...prev, name]);
    setMoodCheckboxes((prev) => new Set([...prev, name]));
    setCustomMoodInput("");
  }

  const [form, setForm] = useState<RatingFormState>({
    song: track,
    vibe: null,
    replay_value: null,
    lyrics: null,
    production: null,
    comparisonWon: null,
    comparisonSongId: null,
    best_for_tags: [],
    genre_tags: [],
    custom_vibe_tag: "",
    album_id: null,
    listened_at: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const toggleTag = (tag: string, field: "best_for_tags" | "genre_tags") =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(tag) ? f[field].filter((t) => t !== tag) : [...f[field], tag],
    }));

  // Load library on mount for comparison candidates
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("ratings")
        .select("id, overall_score, song:songs(title, artist, album_art_url)")
        .eq("user_id", user.id)
        .order("overall_score", { ascending: false })
        .then(({ data }) => {
          if (!data) return;
          setLibrarySongs((data as any[]).map((r) => ({
            ratingId: r.id,
            title: r.song?.title ?? "Unknown",
            artist: r.song?.artist ?? "",
            albumArt: r.song?.album_art_url ?? null,
            score: r.overall_score,
          })));
        });
    });
  }, []);

  const hasComparison = librarySongs.length >= 2;
  // With comparison: 1=Vibe 2=Dims 3=Compare 4=Tags 5=Reveal
  // Without:         1=Vibe 2=Dims 3=Tags 4=Reveal
  const STEP_COMPARE = hasComparison ? 3 : -1;
  const STEP_TAGS    = hasComparison ? 4 : 3;
  const STEP_REVEAL  = hasComparison ? 5 : 4;
  const totalSteps   = hasComparison ? 5 : 4;

  // Score: base from dims+vibe ± comparison modifier, capped 1–10
  const baseScore =
    form.replay_value && form.lyrics && form.production && form.vibe
      ? calculateScore({ replay_value: form.replay_value, lyrics: form.lyrics, production: form.production, vibe: form.vibe })
      : null;
  const compMod = compResults.reduce(
    (acc, r) => acc + (r === "won" ? 0.1 : r === "lost" ? -0.1 : 0), 0
  );
  const displayScore = baseScore !== null
    ? Math.min(10, Math.max(1, Math.round((baseScore + compMod) * 10) / 10))
    : null;

  function pickInComparison(result: "won" | "lost" | "skipped") {
    const newResults = [...compResults, result];
    setCompResults(newResults);
    if (newResults.length < compCandidates.length) {
      setCompRoundIdx((i) => i + 1);
    } else {
      setStep(STEP_TAGS);
    }
  }

  const canAdvance = () => {
    if (step === 1) return form.vibe !== null;
    if (step === 2) return form.replay_value !== null && form.lyrics !== null && form.production !== null;
    return !saving;
  };

  function advance() {
    // During comparison step, the footer button skips all remaining rounds
    if (step === STEP_COMPARE) {
      setStep(STEP_TAGS);
      return;
    }
    if (step === 2) {
      // Freeze comparison candidates based on current score
      if (hasComparison && baseScore !== null) {
        const cands = librarySongs
          .filter((s) => Math.abs(s.score - baseScore) <= 1.5)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        setCompCandidates(cands);
        setCompRoundIdx(0);
        setCompResults([]);
        setStep(cands.length > 0 ? STEP_COMPARE : STEP_TAGS);
      } else {
        setStep(STEP_TAGS);
      }
    } else if (step === STEP_TAGS) {
      setStep(STEP_REVEAL);
    } else if (step === STEP_REVEAL) {
      handleSave();
    } else {
      setStep(step + 1);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Not signed in — please log in and try again.");

      // Get or create song
      let songId: string;
      const { data: existing } = await supabase
        .from("songs").select("id").eq("spotify_id", track.id).single();
      if (existing) {
        songId = existing.id;
      } else {
        const payload: Record<string, unknown> = {
          spotify_id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album_name: track.album?.name ?? "",
          album_art_url: track.album?.images?.[0]?.url ?? null,
          duration_seconds: Math.round(track.duration_ms / 1000),
        };
        if (track.album?.id) payload.spotify_album_id = track.album.id;

        let { data: newSong, error: songErr } = await supabase
          .from("songs").insert(payload).select("id").single();
        if (songErr?.message?.includes("spotify_album_id")) {
          delete payload.spotify_album_id;
          ({ data: newSong, error: songErr } = await supabase
            .from("songs").insert(payload).select("id").single());
        }
        if (songErr) throw new Error(`Could not save song: ${songErr.message}`);
        songId = newSong!.id;
      }

      const { error: ratingErr } = await supabase.from("ratings").upsert({
        user_id: user.id,
        song_id: songId,
        vibe: form.vibe,
        replay_value: form.replay_value,
        lyrics: form.lyrics,
        production: form.production,
        overall_score: displayScore ?? 5.0,
        notes: form.notes || null,
        best_for_tags: form.best_for_tags.map((t) =>
          t === "Other" && otherVibeText.trim() ? otherVibeText.trim() : t
        ),
        genre_tags: form.genre_tags,
        listened_at: form.listened_at,
      }, { onConflict: "user_id,song_id" });
      if (ratingErr) throw new Error(`Could not save rating: ${ratingErr.message}`);

      // Add song to checked mood lists (find-or-create each collection by name)
      for (const moodName of moodCheckboxes) {
        let colId: string | null = null;
        const { data: found } = await supabase.from("collections")
          .select("id").eq("user_id", user.id).eq("name", moodName).single();
        if (found) {
          colId = found.id;
        } else {
          const { data: created } = await supabase.from("collections")
            .insert({ user_id: user.id, name: moodName }).select("id").single();
          colId = created?.id ?? null;
        }
        if (colId) {
          await supabase.from("collection_songs").upsert(
            { collection_id: colId, song_id: songId },
            { onConflict: "collection_id,song_id" }
          );
        }
      }

      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const albumArt = track.album?.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e2d3d] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-white/5">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            {albumArt && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <Image src={albumArt} alt={track.album?.name ?? ""} fill className="object-cover" sizes="40px" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-100 truncate">{track.name}</p>
              <p className="text-xs text-slate-500 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-3">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i + 1 <= step ? "bg-[#4fc3f7]" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">Step {step} of {totalSteps}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* 1 — Vibe */}
          {step === 1 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-1">Vibe check</h2>
              <p className="text-sm text-slate-500 mb-6">How did this track hit you?</p>
              <div className="flex flex-col gap-3">
                {vibeOptions.map(({ key, label, emoji }) => (
                  <button key={key} onClick={() => setForm((f) => ({ ...f, vibe: key }))}
                    className={`vibe-btn flex items-center gap-4 px-5 py-4 rounded-2xl border-2 font-semibold text-left transition-all ${
                      form.vibe === key
                        ? "border-[#4fc3f7] bg-[#4fc3f7]/10 text-slate-100 ring-2 ring-[#4fc3f7]/30"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2 — Dimensions */}
          {step === 2 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-1">Dimension ratings</h2>
              <p className="text-sm text-slate-500 mb-6">Rate each dimension 1–10</p>
              {DIMENSION_META.map(({ field, label, description }) => (
                <RatingCircleRow key={field} label={label} description={description}
                  value={form[field]} color={DIM_COLORS[field]}
                  onChange={(v) => setForm((f) => ({ ...f, [field]: v }))} />
              ))}
            </div>
          )}

          {/* 3 — Head to head comparison (only when library has ≥2 songs) */}
          {step === STEP_COMPARE && compCandidates.length > 0 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-0.5">Head to head</h2>
              <p className="text-sm text-slate-500 mb-1">
                Round {compRoundIdx + 1} of {compCandidates.length} — which do you prefer?
              </p>
              <p className="text-xs text-slate-700 mb-5">
                Your choice nudges the final score slightly.
              </p>

              <div className="flex gap-3 mb-4">
                {/* New track */}
                <button
                  onClick={() => pickInComparison("won")}
                  className="flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-[#4fc3f7]/50 transition-all active:scale-95"
                >
                  {albumArt && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={albumArt} alt={track.name} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-100 line-clamp-2">{track.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
                    <p className="text-xs font-bold text-[#4fc3f7] mt-1">This one ✓</p>
                  </div>
                </button>

                {/* Library track */}
                <button
                  onClick={() => pickInComparison("lost")}
                  className="flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-[#4fc3f7]/50 transition-all active:scale-95"
                >
                  {compCandidates[compRoundIdx]?.albumArt && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={compCandidates[compRoundIdx].albumArt!} alt={compCandidates[compRoundIdx].title} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-100 line-clamp-2">{compCandidates[compRoundIdx]?.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{compCandidates[compRoundIdx]?.artist}</p>
                    <ScoreCircle score={compCandidates[compRoundIdx]?.score ?? 5} size={28} />
                  </div>
                </button>
              </div>

              <button
                onClick={() => pickInComparison("skipped")}
                className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-500 hover:bg-white/5 transition-colors"
              >
                Too close to call — skip this round
              </button>
            </div>
          )}

          {/* Tags — step number depends on whether comparison is active */}
          {step === STEP_TAGS && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-1">Tags & details</h2>
              <p className="text-sm text-slate-500 mb-5">Tell more about how you heard it</p>

              {/* Best for — "Other" expands inline */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">Best for</p>
                <div className="flex flex-wrap gap-2">
                  {BEST_FOR_TAGS.map((tag) => {
                    const selected = form.best_for_tags.includes(tag);
                    if (tag === "Other" && selected) {
                      // Expanded inline input
                      return (
                        <div key="Other"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#4fc3f7] bg-[#4fc3f7]/20 text-white">
                          <span className="text-sm font-medium shrink-0">Other:</span>
                          <input
                            autoFocus
                            value={otherVibeText}
                            onChange={(e) => setOtherVibeText(e.target.value.slice(0, 30))}
                            placeholder="e.g. Sunday morning"
                            className="w-28 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={() => { toggleTag("Other", "best_for_tags"); setOtherVibeText(""); }}
                            className="text-white/50 hover:text-white text-base leading-none ml-0.5"
                          >×</button>
                        </div>
                      );
                    }
                    return (
                      <button key={tag} onClick={() => toggleTag(tag, "best_for_tags")}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          selected
                            ? "bg-[#4fc3f7]/50 border-[#4fc3f7] text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                        }`}>{tag}</button>
                    );
                  })}
                </div>

                {/* Checkboxes — one per selected tag, plus custom entries */}
                {(form.best_for_tags.length > 0 || customMoodEntries.length > 0) && (
                  <div className="mt-4 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add to mood list</p>
                    {[
                      ...form.best_for_tags.map((t) =>
                        t === "Other" && otherVibeText.trim() ? otherVibeText.trim() : t
                      ),
                      ...customMoodEntries,
                    ]
                      .filter((v, i, a) => a.indexOf(v) === i) // dedupe
                      .map((name) => (
                        <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                          <button
                            type="button"
                            onClick={() => toggleMoodCheckbox(name)}
                            className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              moodCheckboxes.has(name)
                                ? "bg-[#4fc3f7] border-[#4fc3f7]"
                                : "border-white/25 bg-transparent group-hover:border-white/40"
                            }`}
                          >
                            {moodCheckboxes.has(name) && (
                              <Check size={11} className="text-[#0d1f35]" strokeWidth={3} />
                            )}
                          </button>
                          <span className="text-sm text-slate-300">
                            Add to <span className="text-slate-100 font-medium">{name}</span> mood list
                          </span>
                        </label>
                      ))}

                    {/* "+" custom mood list */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[#4fc3f7] text-base font-bold leading-none shrink-0">+</span>
                      <input
                        value={customMoodInput}
                        onChange={(e) => setCustomMoodInput(e.target.value.slice(0, 50))}
                        onKeyDown={(e) => e.key === "Enter" && addCustomMoodEntry()}
                        onBlur={addCustomMoodEntry}
                        placeholder="Custom mood list… (press Enter)"
                        className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-700 outline-none border-b border-white/10 pb-0.5 focus:border-[#4fc3f7]/50 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">Genre</p>
                <div className="flex flex-wrap gap-2">
                  {GENRE_TAGS.map((tag) => (
                    <button key={tag} onClick={() => toggleTag(tag, "genre_tags")}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        form.genre_tags.includes(tag)
                          ? "bg-slate-100 border-slate-100 text-slate-900"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}>{tag}</button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Date listened</label>
                <input type="date" value={form.listened_at}
                  onChange={(e) => setForm((f) => ({ ...f, listened_at: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-sm bg-white/5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/50 [color-scheme:dark]" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                  Notes <span className="normal-case font-normal text-slate-600">(optional)</span>
                </label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="What stood out?" rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 text-sm bg-white/5 text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/50 placeholder-slate-700" />
              </div>
            </div>
          )}

          {/* Score reveal */}
          {step === STEP_REVEAL && displayScore !== null && (
            <div className="page-enter flex flex-col items-center py-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">Your score</h2>
              <p className="text-sm text-slate-500 mb-8">
                {compResults.length > 0 ? "Based on dimensions, vibe, and your comparisons" : "Based on your ratings"}
              </p>

              {saveError && (
                <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl px-4 py-3 mb-4">
                  {saveError}
                </div>
              )}

              <div className="score-reveal relative w-40 h-40 rounded-full flex items-center justify-center shadow-2xl shadow-[#050e1a]/60 bg-gradient-to-br from-[#4fc3f7] to-[#0a8fc4] mb-8">
                <span className="text-5xl font-black text-white">{displayScore.toFixed(1)}</span>
              </div>

              <div className="w-full bg-white/5 rounded-2xl p-4 space-y-2">
                {DIMENSION_META.map(({ field, label }) => (
                  <div key={field} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: DIM_COLORS[field] }}>{form[field]}/10</span>
                  </div>
                ))}
                {form.vibe && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                    <span className="text-slate-500">Vibe</span>
                    <span className="font-semibold text-slate-200 capitalize">{form.vibe.replace("_", " ")}</span>
                  </div>
                )}
                {compResults.length > 0 && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                    <span className="text-slate-500">Head to head</span>
                    <span className="font-semibold text-slate-400">
                      {compResults.filter(r => r === "won").length}W — {compResults.filter(r => r === "lost").length}L
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-white/5 flex gap-3">
          {step > 1 && step !== STEP_COMPARE && (
            <button onClick={() => setStep(step - 1)} disabled={saving}
              className="w-10 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-40">
              <ChevronLeft size={18} className="text-slate-400" />
            </button>
          )}
          <button onClick={advance} disabled={!canAdvance()}
            className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              canAdvance()
                ? "bg-[#4fc3f7]/80 text-white hover:bg-[#4fc3f7] shadow-lg shadow-[#050e1a]/50"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
            }`}
          >
            {saving ? <span className="animate-pulse">Saving…</span>
              : step === STEP_REVEAL ? "Save rating"
              : step === STEP_COMPARE ? "Skip all comparisons →"
              : <><span>Continue</span><ChevronRight size={16} /></>}
          </button>
        </div>

      </div>
    </div>
  );
}
