"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { SpotifyTrack, VibeOption, RatingFormState, BEST_FOR_TAGS, GENRE_TAGS, Song } from "@/types";
import { scoreColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface RatingModalProps {
  track: SpotifyTrack;
  onClose: () => void;
  onSaved: () => void;
}

// New step order: 1=Vibe, 2=Dimensions, 3=Tags, 4..3+N=Comparisons (0-3), 4+N=Reveal+Save

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

function RatingCircleRow({ label, description, value, onChange }: {
  label: string; description: string; value: number | null; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-7">
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="text-sm font-semibold text-slate-300">{label}</span>
          <p className="text-xs italic text-slate-600 mt-0.5">{description}</p>
        </div>
        <span className="text-sm font-bold text-[#4fc3f7] mt-0.5 shrink-0">{value ?? "—"}</span>
      </div>
      <div className="flex gap-1.5 justify-between mt-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          return (
            <button key={n} onClick={() => onChange(n)}
              className={`rating-circle w-8 h-8 rounded-full text-xs font-bold border transition-all flex items-center justify-center ${
                selected
                  ? "bg-[#4fc3f7]/50 border-[#4fc3f7] text-white selected shadow-md"
                  : "bg-white/5 border-white/10 text-slate-500 hover:border-[#4fc3f7]/50 hover:text-[#4fc3f7]"
              }`}
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
}

type ExistingRating = { id: string; song: Song; overall_score: number };

function computeScore(
  replay_value: number | null,
  lyrics: number | null,
  production: number | null,
  vibe: VibeOption | null,
  comparisonResults: (boolean | null)[]
): number | null {
  if (!vibe || !replay_value || !lyrics || !production) return null;
  const base = (replay_value + lyrics + production) / 3;
  const vibemod = vibe === "loved" ? 0.5 : vibe === "didnt_like" ? -0.5 : 0;
  const compmod = comparisonResults.reduce(
    (acc, r) => acc + (r === true ? 0.2 : r === false ? -0.2 : 0), 0
  );
  return Math.min(10, Math.max(1, Math.round((base + vibemod + compmod) * 10) / 10));
}

export default function RatingModal({ track, onClose, onSaved }: RatingModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Up to 3 shuffled comparison songs, loaded on mount
  const [comparisonSongs, setComparisonSongs] = useState<ExistingRating[]>([]);
  // One result per comparison song: true=won, false=lost, null=skipped
  const [comparisonResults, setComparisonResults] = useState<(boolean | null)[]>([]);

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

  useEffect(() => {
    async function loadExisting() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("ratings")
        .select("id, overall_score, song:songs(id, title, artist, album_art_url, duration_seconds, album_name, spotify_id, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!data?.length) return;
      const ratings = data as unknown as ExistingRating[];
      // Shuffle and pick up to 3 distinct songs
      const shuffled = [...ratings].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(3, shuffled.length));
      setComparisonSongs(picked);
      setComparisonResults(new Array(picked.length).fill(null));
    }
    loadExisting();
  }, []);

  const numComparisons = comparisonSongs.length;
  const totalSteps = 3 + numComparisons + 1; // vibe + dims + tags + comps + reveal
  const revealStep = 4 + numComparisons;     // last step

  const score = computeScore(
    form.replay_value, form.lyrics, form.production, form.vibe, comparisonResults
  );

  const toggleTag = (tag: string, field: "best_for_tags" | "genre_tags") => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(tag) ? f[field].filter((t) => t !== tag) : [...f[field], tag],
    }));
  };

  const isComparisonStep = step >= 4 && step <= 3 + numComparisons;
  const compIdx = isComparisonStep ? step - 4 : -1;
  const currentComparison = compIdx >= 0 ? comparisonSongs[compIdx] : null;

  const canAdvance = (): boolean => {
    if (step === 1) return form.vibe !== null;
    if (step === 2) return form.replay_value !== null && form.lyrics !== null && form.production !== null;
    return !saving; // steps 3, comparison steps, and reveal are always advanceable
  };

  function setCompResult(idx: number, result: boolean | null) {
    setComparisonResults((prev) => {
      const next = [...prev];
      next[idx] = result;
      return next;
    });
  }

  function advance() {
    if (step < revealStep) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  }

  function back() {
    if (step > 1) {
      // If leaving a comparison step, clear that result so it doesn't accumulate
      if (isComparisonStep) setCompResult(compIdx, null);
      setStep(step - 1);
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
      const { data: existingSong } = await supabase
        .from("songs").select("id").eq("spotify_id", track.id).single();

      if (existingSong) {
        songId = existingSong.id;
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
        overall_score: score,
        notes: form.notes || null,
        best_for_tags: [
          ...form.best_for_tags,
          ...(form.custom_vibe_tag.trim() ? [form.custom_vibe_tag.trim()] : []),
        ],
        genre_tags: form.genre_tags,
        listened_at: form.listened_at,
      }, { onConflict: "user_id,song_id" });
      if (ratingErr) throw new Error(`Could not save rating: ${ratingErr.message}`);

      // Save all non-null comparison results
      for (let i = 0; i < comparisonSongs.length; i++) {
        const result = comparisonResults[i];
        if (result !== null) {
          await supabase.from("comparisons").insert({
            user_id: user.id,
            winner_song_id: result ? songId : comparisonSongs[i].song.id,
            loser_song_id:  result ? comparisonSongs[i].song.id : songId,
          });
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

        {/* Progress bar */}
        <div className="px-5 pt-3">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-[#4fc3f7]" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">Step {step} of {totalSteps}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Step 1: Vibe */}
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

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-1">Dimension ratings</h2>
              <p className="text-sm text-slate-500 mb-6">Rate each dimension 1–10</p>
              {DIMENSION_META.map(({ field, label, description }) => (
                <RatingCircleRow key={field} label={label} description={description}
                  value={form[field]} onChange={(v) => setForm((f) => ({ ...f, [field]: v }))} />
              ))}
            </div>
          )}

          {/* Step 3: Tags */}
          {step === 3 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-1">Tags & details</h2>
              <p className="text-sm text-slate-500 mb-5">Tell more about how you heard it</p>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">Best for</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {BEST_FOR_TAGS.map((tag) => (
                    <button key={tag} onClick={() => toggleTag(tag, "best_for_tags")}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        form.best_for_tags.includes(tag)
                          ? "bg-[#4fc3f7]/50 border-[#4fc3f7] text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}>{tag}</button>
                  ))}
                </div>
                {/* Custom vibe */}
                <input
                  type="text"
                  value={form.custom_vibe_tag}
                  onChange={(e) => setForm((f) => ({ ...f, custom_vibe_tag: e.target.value.slice(0, 30) }))}
                  placeholder="Other vibe… (e.g. Sunday morning)"
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/50"
                />
                {form.custom_vibe_tag && (
                  <p className="text-xs text-slate-600 mt-1 text-right">{form.custom_vibe_tag.length}/30</p>
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

          {/* Comparison steps 4..3+N */}
          {isComparisonStep && currentComparison && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-100 mb-0.5">Head to head</h2>
              <p className="text-xs text-slate-600 mb-5">
                Round {compIdx + 1} of {numComparisons} — which do you prefer?
              </p>

              <div className="flex gap-3 mb-4">
                {/* New track */}
                <button onClick={() => setCompResult(compIdx, true)}
                  className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    comparisonResults[compIdx] === true
                      ? "border-[#4fc3f7] bg-[#4fc3f7]/10 ring-2 ring-[#4fc3f7]/30"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  {albumArt && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={albumArt} alt={track.name} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-100 line-clamp-2">{track.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
                    <p className="text-xs font-bold text-[#4fc3f7] mt-1">New</p>
                  </div>
                </button>

                {/* Existing track */}
                <button onClick={() => setCompResult(compIdx, false)}
                  className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    comparisonResults[compIdx] === false
                      ? "border-[#4fc3f7] bg-[#4fc3f7]/10 ring-2 ring-[#4fc3f7]/30"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  {currentComparison.song.album_art_url && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={currentComparison.song.album_art_url} alt={currentComparison.song.title} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-100 line-clamp-2">{currentComparison.song.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{currentComparison.song.artist}</p>
                    <p className={`text-xs font-bold mt-1 ${scoreColor(currentComparison.overall_score)}`}>
                      {currentComparison.overall_score.toFixed(1)}
                    </p>
                  </div>
                </button>
              </div>

              {/* Too close to call — immediately advances with null result */}
              <button onClick={() => { setCompResult(compIdx, null); setStep(step + 1); }}
                disabled={saving}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-400 hover:border-white/20 hover:text-slate-300 transition-all disabled:opacity-40">
                Too close to call — skip this round
              </button>
            </div>
          )}

          {/* Reveal step */}
          {step === revealStep && score !== null && (
            <div className="page-enter flex flex-col items-center py-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">Your score</h2>
              <p className="text-sm text-slate-500 mb-8">Based on your ratings</p>

              {saveError && (
                <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl px-4 py-3 mb-4">
                  {saveError}
                </div>
              )}

              <div className="score-reveal relative w-40 h-40 rounded-full flex items-center justify-center shadow-2xl shadow-[#050e1a]/60 bg-gradient-to-br from-[#4fc3f7] to-[#0a8fc4] mb-8">
                <span className="text-5xl font-black text-white">{score.toFixed(1)}</span>
              </div>

              <div className="w-full bg-white/5 rounded-2xl p-4 space-y-2">
                {[
                  ["Replay Value", form.replay_value],
                  ["Lyrics",       form.lyrics],
                  ["Production",   form.production],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label as string}</span>
                    <span className="font-semibold text-slate-200">{val}/10</span>
                  </div>
                ))}
                {form.vibe && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                    <span className="text-slate-500">Vibe</span>
                    <span className="font-semibold text-slate-200 capitalize">{form.vibe.replace("_", " ")}</span>
                  </div>
                )}
                {numComparisons > 0 && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                    <span className="text-slate-500">Comparisons</span>
                    <span className="font-semibold text-slate-200">
                      {comparisonResults.filter(r => r === true).length}W –{" "}
                      {comparisonResults.filter(r => r === false).length}L
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-white/5 flex gap-3">
          {step > 1 && (
            <button onClick={back} disabled={saving}
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
              : step === revealStep ? "Save rating"
              : <><span>Continue</span><ChevronRight size={16} /></>}
          </button>
        </div>

      </div>
    </div>
  );
}
