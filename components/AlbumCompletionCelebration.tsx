"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export interface CelebrationData {
  albumName: string;
  artist: string;
  albumArt: string | null;
  finalScore: number;
}

interface Props extends CelebrationData {
  onDone: () => void;
}

// Pre-generate particles so they're stable across renders
const PARTICLE_COUNT = 30;
const COLORS = ["#4ade80", "#86efac", "#22d3ee", "#4fa8ff", "#a3e635", "#34d399"];
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * 360 + (Math.random() - 0.5) * 25;
  const rad = (angle * Math.PI) / 180;
  const dist = 90 + Math.random() * 130;
  return {
    tx: Math.cos(rad) * dist,
    ty: Math.sin(rad) * dist,
    rot: Math.random() * 720,
    size: 5 + Math.random() * 10,
    delay: Math.random() * 0.3,
    dur: 0.7 + Math.random() * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    round: i % 3 !== 0,
  };
});

function playDrumroll() {
  try {
    const ctx = new AudioContext();
    const total = 14;
    for (let i = 0; i < total; i++) {
      const when = ctx.currentTime + i * (1.1 / total);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 55 + (i / total) * 45;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.14, when + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.085);
      osc.start(when);
      osc.stop(when + 0.09);
    }
    // Final accent note
    const accent = ctx.createOscillator();
    const aGain = ctx.createGain();
    accent.connect(aGain);
    aGain.connect(ctx.destination);
    accent.type = "sine";
    accent.frequency.value = 220;
    aGain.gain.setValueAtTime(0.18, ctx.currentTime + 1.15);
    aGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    accent.start(ctx.currentTime + 1.15);
    accent.stop(ctx.currentTime + 1.5);
  } catch {}
}

export default function AlbumCompletionCelebration({ albumName, artist, albumArt, finalScore, onDone }: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [displayScore, setDisplayScore] = useState(0);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    // Text explodes in at 150ms
    const t0 = setTimeout(() => setTextVisible(true), 150);
    // Transition to Phase 2 at 1300ms
    const t1 = setTimeout(() => {
      setPhase(2);
      playDrumroll();
      // Animate score counter over ~1100ms
      const start = Date.now();
      const duration = 1100;
      const tick = setInterval(() => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setDisplayScore(eased * finalScore);
        if (p >= 1) {
          clearInterval(tick);
          setDisplayScore(finalScore);
          setTimeout(() => setPhase(3), 250);
        }
      }, 22);
    }, 1300);

    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [finalScore]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.95)" }}
    >
      {/* ── Phase 1: Particles + ALBUM COMPLETE text ── */}
      {phase === 1 && (
        <>
          {/* Confetti burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.round ? "50%" : "3px",
                  ["--tx" as any]: `${p.tx}px`,
                  ["--ty" as any]: `${p.ty}px`,
                  ["--rot" as any]: `${p.rot}deg`,
                  animation: textVisible
                    ? `particleBurst ${p.dur}s ${p.delay}s ease-out forwards`
                    : "none",
                  opacity: textVisible ? 1 : 0,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* "ALBUM COMPLETE" text */}
          <div
            className="relative z-10 text-center px-6 select-none"
            style={{
              animation: textVisible ? "albumCompleteIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
              transform: textVisible ? undefined : "scale(0)",
              opacity: textVisible ? undefined : 0,
            }}
          >
            <p
              className="font-black text-white leading-none tracking-tight"
              style={{ fontSize: "clamp(36px, 11vw, 58px)", letterSpacing: "-0.03em" }}
            >
              ALBUM
            </p>
            <p
              className="font-black leading-none tracking-tight"
              style={{
                fontSize: "clamp(36px, 11vw, 58px)",
                letterSpacing: "-0.03em",
                color: "#4ade80",
              }}
            >
              COMPLETE
            </p>
          </div>
        </>
      )}

      {/* ── Phase 2+: Album art + rolling score ── */}
      {phase >= 2 && (
        <div
          className="flex flex-col items-center gap-5 px-6 w-full max-w-xs"
          style={{ animation: "celebFadeSlideUp 0.45s ease forwards" }}
        >
          {/* Album art */}
          <div
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{ width: 200, height: 200, background: "#1A1A1A" }}
          >
            {albumArt ? (
              <Image src={albumArt} alt={albumName} width={200} height={200} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">💿</div>
            )}
          </div>

          {/* Album info */}
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-tight">{albumName}</p>
            <p className="text-white/50 text-sm mt-1">{artist}</p>
          </div>

          {/* Rolling score */}
          <div className="text-center" style={{ animation: "scoreCounterIn 0.35s ease forwards" }}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Album Average</p>
            <p
              className="font-black tabular-nums leading-none"
              style={{ fontSize: 76, color: "#4ade80" }}
            >
              {displayScore.toFixed(1)}
            </p>
          </div>

          {/* Phase 3: reveal copy + buttons */}
          {phase === 3 && (
            <div
              className="flex flex-col items-center gap-4 w-full"
              style={{ animation: "celebFadeSlideUp 0.4s ease forwards" }}
            >
              <p className="text-white/75 text-center text-sm leading-relaxed px-2">
                Your rating for <strong className="text-white">{albumName}</strong> has landed
                at <strong style={{ color: "#4ade80" }}>{finalScore.toFixed(1)}</strong>!
              </p>

              <div className="flex gap-3 w-full pt-1">
                <button
                  disabled
                  className="flex-1 py-3.5 rounded-2xl border border-white/15 text-white/40 text-sm font-semibold cursor-not-allowed"
                >
                  Share
                </button>
                <button
                  onClick={onDone}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-[#0D0D0D]"
                  style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
