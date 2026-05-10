"use client";

import { useState, useRef } from "react";

export interface TasteItem {
  label: string;
  emoji: string;
  value: number;   // 0–1, normalised so the top item = 1.0
  rawPct: number;  // percentage of songs (for legend display)
  color: string;
}

interface Props {
  genreItems: TasteItem[];
  vibeItems: TasteItem[];
  headline: string;
}

function HexagonChart({ items }: { items: TasteItem[] }) {
  const n = items.length;
  if (n < 3) return null;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cx = 142, cy = 148, r = 105, labelR = 136;
  const angles = Array.from({ length: n }, (_, i) =>
    ((i * (360 / n) - 90) * Math.PI) / 180
  );

  function ringPath(frac: number) {
    return (
      angles
        .map((a, i) => {
          const v = r * frac;
          return `${i === 0 ? "M" : "L"} ${cx + v * Math.cos(a)},${cy + v * Math.sin(a)}`;
        })
        .join(" ") + " Z"
    );
  }

  // Minimum plot radius = 30% for any genre that has data, so even small genres
  // produce a visible shape rather than collapsing to near-center
  function plotV(value: number) {
    if (value <= 0) return 0;
    return Math.min(1, Math.max(0.30, value));
  }

  const profilePath =
    items
      .map((item, i) => {
        const v = plotV(item.value);
        const a = angles[i];
        return `${i === 0 ? "M" : "L"} ${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`;
      })
      .join(" ") + " Z";

  return (
    <svg width={284} height={296} viewBox="0 0 284 296">
      {/* Background rings */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <path key={frac} d={ringPath(frac)} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}

      {/* Colored spokes */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke={items[i].color} strokeWidth={3} strokeOpacity={0.6} />
      ))}

      {/* Filled profile */}
      <path d={profilePath} fill="rgba(79,195,247,0.14)"
        stroke="#4fc3f7" strokeWidth={3} strokeLinejoin="round" />

      {/* Colored vertex dots — positioned at the same plotV radius as the polygon */}
      {items.map((item, i) => {
        const v = plotV(item.value);
        const a = angles[i];
        const px = cx + r * v * Math.cos(a);
        const py = cy + r * v * Math.sin(a);
        return (
          <circle key={i} cx={px} cy={py} r={6}
            fill={item.color} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
        );
      })}

      {/* Axis labels — larger, tappable, show % tooltip on hover */}
      {angles.map((a, i) => {
        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        const ca = Math.cos(a);
        const anchor = Math.abs(ca) < 0.15 ? "middle" : ca < 0 ? "end" : "start";
        const shortLabel = items[i].label.length > 9 ? items[i].label.slice(0, 8) + "…" : items[i].label;
        const isHovered = hoveredIdx === i;
        return (
          <g key={i} style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setHoveredIdx(isHovered ? null : i)}>
            <text x={lx} y={ly - 6} textAnchor={anchor as any}
              fontSize={16} fill={items[i].color}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
              {items[i].emoji}
            </text>
            <text x={lx} y={ly + 11} textAnchor={anchor as any}
              fontSize={11} fontWeight="700" fill={isHovered ? items[i].color : "rgba(148,163,184,0.9)"}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">
              {shortLabel}
            </text>
            {/* Tooltip bubble on hover */}
            {isHovered && (() => {
              const bx = lx + (Math.abs(ca) < 0.15 ? 0 : ca < 0 ? -32 : 32);
              const by = ly - 28;
              return (
                <g>
                  <rect x={bx - 20} y={by - 12} width={40} height={18} rx={5}
                    fill={items[i].color} opacity={0.95} />
                  <text x={bx} y={by + 1} textAnchor="middle" fontSize={10} fontWeight="700"
                    fill="white" fontFamily="-apple-system, sans-serif">
                    {items[i].rawPct}%
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

export default function TasteRadar({ genreItems, vibeItems, headline }: Props) {
  const [mode, setMode] = useState<"genre" | "vibe">("genre");
  const items = mode === "genre" ? genreItems : vibeItems;
  const hasEnough = items.length >= 3;

  if (genreItems.length < 3 && vibeItems.length < 3) return null;

  return (
    <div>
      {/* Generated headline */}
      {headline && (
        <p className="text-sm font-semibold text-slate-200 mb-4 leading-relaxed bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
          {headline}
        </p>
      )}

      {/* Toggle pills */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-4">
        <button onClick={() => setMode("genre")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === "genre"
              ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}>
          🧬 Genre DNA
        </button>
        <button onClick={() => setMode("vibe")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            mode === "vibe"
              ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}>
          ✨ Vibe DNA
        </button>
      </div>

      {hasEnough ? (
        <>
          <div className="flex justify-center -mx-2">
            <HexagonChart items={items} />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400 truncate">{item.label}</span>
                <span className="text-xs font-bold ml-auto tabular-nums shrink-0"
                  style={{ color: item.color }}>
                  {item.rawPct}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-600 text-center py-6">
          Rate more songs with {mode === "genre" ? "genre" : "best-for"} tags to unlock this
        </p>
      )}
    </div>
  );
}
