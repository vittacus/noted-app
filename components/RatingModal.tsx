"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { SpotifyTrack, VibeOption, RatingFormState, BEST_FOR_TAGS, GENRE_TAGS, Song, Rating } from "@/types";
import { calculateScore, formatDuration, scoreColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface RatingModalProps {
  track: SpotifyTrack;
  onClose: () => void;
  onSaved: () => void;
}

const TOTAL_STEPS = 5;

const vibeOptions: { key: VibeOption; label: string; emoji: string; color: string }[] = [
  { key: "loved", label: "I loved it", emoji: "🔥", color: "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100" },
  { key: "liked", label: "I liked it", emoji: "👍", color: "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100" },
  { key: "didnt_like", label: "I didn't like it", emoji: "😐", color: "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" },
];

function RatingCircleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-blue-500">{value ?? "—"}</span>
      </div>
      <div className="flex gap-1.5 justify-between">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`rating-circle w-8 h-8 rounded-full text-xs font-bold border transition-all flex items-center justify-center ${
                selected
                  ? "bg-blue-500 border-blue-500 text-white selected shadow-md shadow-blue-200"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-500"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RatingModal({ track, onClose, onSaved }: RatingModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [existingRatings, setExistingRatings] = useState<{ id: string; song: Song; overall_score: number }[]>([]);
  const [comparisonSong, setComparisonSong] = useState<{ id: string; song: Song; overall_score: number } | null>(null);

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
        .limit(20);
      if (data && data.length >= 2) {
        const ratings = data as any[];
        setExistingRatings(ratings);
        const pick = ratings[Math.floor(Math.random() * ratings.length)];
        setComparisonSong(pick);
      }
    }
    loadExisting();
  }, []);

  const toggleTag = (tag: string, field: "best_for_tags" | "genre_tags") => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(tag)
        ? f[field].filter((t) => t !== tag)
        : [...f[field], tag],
    }));
  };

  const canAdvance = () => {
    if (step === 1) return form.vibe !== null;
    if (step === 2) return form.replay_value !== null && form.lyrics !== null && form.production !== null;
    if (step === 3) return true; // comparison optional
    if (step === 4) return true; // tags optional
    return false;
  };

  const score =
    form.vibe && form.replay_value && form.lyrics && form.production
      ? calculateScore({
          replay_value: form.replay_value,
          lyrics: form.lyrics,
          production: form.production,
          vibe: form.vibe,
          comparisonWon: form.comparisonWon,
        })
      : null;

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert song
      const { data: songData, error: songErr } = await supabase
        .from("songs")
        .upsert({
          spotify_id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album_name: track.album.name,
          album_art_url: track.album.images[0]?.url ?? null,
          duration_seconds: Math.round(track.duration_ms / 1000),
        }, { onConflict: "spotify_id" })
        .select()
        .single();
      if (songErr) throw songErr;

      // Save rating
      const { error: ratingErr } = await supabase.from("ratings").upsert({
        user_id: user.id,
        song_id: songData.id,
        vibe: form.vibe,
        replay_value: form.replay_value,
        lyrics: form.lyrics,
        production: form.production,
        overall_score: score,
        notes: form.notes || null,
        best_for_tags: form.best_for_tags,
        genre_tags: form.genre_tags,
        listened_at: form.listened_at,
      }, { onConflict: "user_id,song_id" });
      if (ratingErr) throw ratingErr;

      // Save comparison
      if (form.comparisonSongId && form.comparisonWon !== null) {
        const { data: compSong } = await supabase
          .from("songs")
          .select("id")
          .eq("id", form.comparisonSongId)
          .single();
        if (compSong) {
          await supabase.from("comparisons").insert({
            user_id: user.id,
            winner_song_id: form.comparisonWon ? songData.id : form.comparisonSongId,
            loser_song_id: form.comparisonWon ? form.comparisonSongId : songData.id,
          });
        }
      }

      onSaved();
    } catch (e) {
      console.error(e);
      alert("Error saving rating. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const skipComparison = existingRatings.length < 2;

  function advance() {
    if (step === 2 && skipComparison) {
      setStep(4);
    } else if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  }

  function back() {
    if (step === 4 && skipComparison) {
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  }

  const effectiveStep = skipComparison && step >= 3 ? step - 1 : step;
  const effectiveTotal = skipComparison ? TOTAL_STEPS - 1 : TOTAL_STEPS;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {track.album.images[0] && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <Image src={track.album.images[0].url} alt={track.album.name} fill className="object-cover" sizes="40px" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{track.name}</p>
              <p className="text-xs text-slate-500 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-3">
          <div className="flex gap-1.5">
            {Array.from({ length: effectiveTotal }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i < effectiveStep ? "bg-blue-500" : "bg-slate-100"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Step {effectiveStep} of {effectiveTotal}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Step 1: Vibe */}
          {step === 1 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Vibe check</h2>
              <p className="text-sm text-slate-500 mb-6">How did this track hit you?</p>
              <div className="flex flex-col gap-3">
                {vibeOptions.map(({ key, label, emoji, color }) => (
                  <button
                    key={key}
                    onClick={() => setForm((f) => ({ ...f, vibe: key }))}
                    className={`vibe-btn flex items-center gap-4 px-5 py-4 rounded-2xl border-2 font-semibold text-left transition-all ${color} ${
                      form.vibe === key ? "ring-2 ring-blue-400 ring-offset-1 border-blue-400" : ""
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Dimension ratings</h2>
              <p className="text-sm text-slate-500 mb-6">Rate each dimension 1–10</p>
              <RatingCircleRow label="Replay Value" value={form.replay_value} onChange={(v) => setForm((f) => ({ ...f, replay_value: v }))} />
              <RatingCircleRow label="Lyrics" value={form.lyrics} onChange={(v) => setForm((f) => ({ ...f, lyrics: v }))} />
              <RatingCircleRow label="Production" value={form.production} onChange={(v) => setForm((f) => ({ ...f, production: v }))} />
            </div>
          )}

          {/* Step 3: Comparison */}
          {step === 3 && !skipComparison && comparisonSong && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Head to head</h2>
              <p className="text-sm text-slate-500 mb-6">Which do you prefer?</p>
              <div className="flex gap-3">
                {/* New track */}
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, comparisonWon: true, comparisonSongId: comparisonSong.song.id }));
                  }}
                  className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    form.comparisonWon === true
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300 ring-offset-1"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  {track.album.images[0] && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={track.album.images[0].url} alt={track.name} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-900 line-clamp-2">{track.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{track.artists.map((a) => a.name).join(", ")}</p>
                    <p className="text-xs font-bold text-blue-400 mt-1">New</p>
                  </div>
                </button>

                {/* Existing track */}
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, comparisonWon: false, comparisonSongId: comparisonSong.song.id }));
                  }}
                  className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    form.comparisonWon === false
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300 ring-offset-1"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  {comparisonSong.song.album_art_url && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                      <Image src={comparisonSong.song.album_art_url} alt={comparisonSong.song.title} fill className="object-cover" sizes="200px" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold text-sm text-slate-900 line-clamp-2">{comparisonSong.song.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{comparisonSong.song.artist}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{comparisonSong.overall_score.toFixed(1)}</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setForm((f) => ({ ...f, comparisonWon: null, comparisonSongId: null }))}
                className="w-full text-center text-xs text-slate-400 mt-4 hover:text-slate-600 transition-colors"
              >
                Skip comparison
              </button>
            </div>
          )}

          {/* Step 4: Tags */}
          {step === 4 && (
            <div className="page-enter">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Tags & details</h2>
              <p className="text-sm text-slate-500 mb-5">Tell more about how you heard it</p>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Best for</p>
                <div className="flex flex-wrap gap-2">
                  {BEST_FOR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag, "best_for_tags")}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        form.best_for_tags.includes(tag)
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Genre</p>
                <div className="flex flex-wrap gap-2">
                  {GENRE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag, "genre_tags")}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        form.genre_tags.includes(tag)
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Date listened
                </label>
                <input
                  type="date"
                  value={form.listened_at}
                  onChange={(e) => setForm((f) => ({ ...f, listened_at: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Notes <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="What stood out?"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-300"
                />
              </div>
            </div>
          )}

          {/* Step 5: Score reveal */}
          {step === 5 && score !== null && (
            <div className="page-enter flex flex-col items-center py-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Your score</h2>
              <p className="text-sm text-slate-500 mb-8">Based on your ratings</p>

              <div className="score-reveal relative w-40 h-40 rounded-full flex items-center justify-center shadow-xl shadow-blue-100 bg-gradient-to-br from-blue-400 to-blue-600 mb-8">
                <span className="text-5xl font-black text-white">{score.toFixed(1)}</span>
              </div>

              <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Replay Value</span>
                  <span className="font-semibold">{form.replay_value}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Lyrics</span>
                  <span className="font-semibold">{form.lyrics}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Production</span>
                  <span className="font-semibold">{form.production}/10</span>
                </div>
                {form.vibe && (
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500">Vibe</span>
                    <span className="font-semibold capitalize">{form.vibe.replace("_", " ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex gap-3">
          {step > 1 && (
            <button
              onClick={back}
              className="w-10 h-12 rounded-2xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={18} className="text-slate-500" />
            </button>
          )}
          <button
            onClick={advance}
            disabled={!canAdvance() || saving}
            className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              canAdvance() && !saving
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-200"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <span className="animate-pulse">Saving…</span>
            ) : step === 5 ? (
              "Save rating"
            ) : (
              <>
                Continue <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
