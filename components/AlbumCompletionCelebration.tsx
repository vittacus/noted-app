"use client";

import { useState, useEffect, useRef } from "react";
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

const PARTICLE_COUNT = 32;
const COLORS = ["#4ade80", "#86efac", "#22d3ee", "#4fa8ff", "#a3e635", "#34d399", "#fff"];
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * 360 + (Math.random() - 0.5) * 28;
  const rad = (angle * Math.PI) / 180;
  const dist = 100 + Math.random() * 140;
  return {
    tx: Math.cos(rad) * dist,
    ty: Math.sin(rad) * dist,
    rot: Math.random() * 720,
    size: 5 + Math.random() * 11,
    delay: Math.random() * 0.2,
    dur: 0.65 + Math.random() * 0.45,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    round: i % 3 !== 0,
  };
});

function playDrumRoll() {
  try {
    const ctx = new AudioContext();
    // 8 square-wave hits at ~80Hz, 80ms apart, increasing intensity
    for (let i = 0; i < 8; i++) {
      const when = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 80 + i * 4; // slight pitch rise for tension
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.18 + i * 0.015, when + 0.005); // quick attack
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.065);       // fast decay
      osc.start(when);
      osc.stop(when + 0.07);
    }
    // Final accent chord when counter starts
    const accent = ctx.createOscillator();
    const aGain = ctx.createGain();
    accent.connect(aGain);
    aGain.connect(ctx.destination);
    accent.type = "sine";
    accent.frequency.value = 261; // C4
    aGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.65);
    aGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    accent.start(ctx.currentTime + 0.65);
    accent.stop(ctx.currentTime + 1.25);
  } catch {}
}

export default function AlbumCompletionCelebration({
  albumName, artist, albumArt, finalScore, onDone,
}: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [displayScore, setDisplayScore] = useState(0);
  const [textVisible, setTextVisible] = useState(false);
  const [bgFlash, setBgFlash] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Immediate green flash
    setBgFlash(true);
    const t0 = setTimeout(() => setBgFlash(false), 300);
    // Text slams in at 200ms
    const t1 = setTimeout(() => setTextVisible(true), 200);
    // Phase 2 at 1400ms
    const t2 = setTimeout(() => {
      setPhase(2);
      playDrumRoll();
      // Start score counter with requestAnimationFrame
      const duration = 1500;
      const startTime = performance.now();
      function tick(now: number) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplayScore(eased * finalScore);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setDisplayScore(finalScore);
          setTimeout(() => setPhase(3), 300);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }, 1400);

    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [finalScore]);

  const bgStyle = bgFlash
    ? { background: "rgba(74,222,128,0.35)" }
    : { background: "rgba(0,0,0,0.97)" };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-150"
      style={bgStyle}
    >
      {/* Phase 1: Particles + "ALBUM COMPLETE" */}
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

          {/* ALBUM COMPLETE text — slams in */}
          <div
            className="relative z-10 text-center px-6 select-none"
            style={{
              animation: textVisible
                ? "albumCompleteIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards"
                : "none",
              transform: "scale(0)",
            }}
          >
            <p
              className="font-black text-white leading-none"
              style={{ fontSize: "clamp(40px, 12vw, 62px)", letterSpacing: "-0.03em" }}
            >
              ALBUM
            </p>
            <p
              className="font-black leading-none"
              style={{
                fontSize: "clamp(40px, 12vw, 62px)",
                letterSpacing: "-0.03em",
                color: "#4ade80",
                textShadow: "0 0 40px rgba(74,222,128,0.6)",
              }}
            >
              COMPLETE
            </p>
          </div>
        </>
      )}

      {/* Phase 2+: Album art + rolling score */}
      {phase >= 2 && (
        <div
          className="flex flex-col items-center gap-5 px-6 w-full max-w-xs"
          style={{ animation: "celebFadeSlideUp 0.5s ease forwards" }}
        >
          {/* Album art */}
          <div
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              width: 200, height: 200,
              background: "#1A1A1A",
              boxShadow: "0 0 40px rgba(74,222,128,0.2)",
            }}
          >
            {albumArt ? (
              <Image src={albumArt} alt={albumName} width={200} height={200} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">💿</div>
            )}
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-lg leading-tight">{albumName}</p>
            <p className="text-white/50 text-sm mt-1">{artist}</p>
          </div>

          {/* Rolling score */}
          <div className="text-center" style={{ animation: "scoreCounterIn 0.4s ease forwards" }}>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Album Average</p>
            <p
              className="font-black tabular-nums leading-none"
              style={{
                fontSize: 80,
                color: "#4ade80",
                textShadow: "0 0 30px rgba(74,222,128,0.5)",
              }}
            >
              {displayScore.toFixed(1)}
            </p>
          </div>

          {/* Phase 3: copy + buttons */}
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
                  Done ✓
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
