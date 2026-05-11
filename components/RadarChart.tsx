interface RadarChartProps {
  values: number[];   // 6 values, each 0–1
  labels: string[];   // 6 labels
  size?: number;
}

const RINGS = [0.25, 0.5, 0.75, 1.0];
const ACCENT = "#4fa8ff";

export default function RadarChart({ values, labels, size = 280 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;      // chart radius
  const labelR = size * 0.46; // label radius

  // Angles: start at top (-90°), go clockwise
  const angles = Array.from({ length: 6 }, (_, i) =>
    ((i * 60 - 90) * Math.PI) / 180
  );

  function pt(frac: number, idx: number) {
    const v = Math.min(1, Math.max(0, frac));
    return {
      x: cx + r * v * Math.cos(angles[idx]),
      y: cy + r * v * Math.sin(angles[idx]),
    };
  }

  // Hexagonal ring path
  function ringPath(frac: number) {
    return angles
      .map((a, i) => {
        const v = r * frac;
        return `${i === 0 ? "M" : "L"} ${cx + v * Math.cos(a)},${cy + v * Math.sin(a)}`;
      })
      .join(" ") + " Z";
  }

  // User profile polygon
  const profilePath =
    values
      .map((v, i) => {
        const p = pt(v, i);
        return `${i === 0 ? "M" : "L"} ${p.x},${p.y}`;
      })
      .join(" ") + " Z";

  // Spokes from center to each vertex
  const spokes = angles.map((a) => ({
    x2: cx + r * Math.cos(a),
    y2: cy + r * Math.sin(a),
  }));

  // Label positions
  const labelPositions = angles.map((a, i) => {
    const x = cx + labelR * Math.cos(a);
    const y = cy + labelR * Math.sin(a);
    const anchor =
      Math.abs(Math.cos(a)) < 0.1 ? "middle"
        : Math.cos(a) < 0 ? "end"
        : "start";
    return { x, y, anchor, label: labels[i], value: values[i] };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background rings */}
      {RINGS.map((frac) => (
        <path
          key={frac}
          d={ringPath(frac)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* Spokes */}
      {spokes.map((s, i) => (
        <line key={i} x1={cx} y1={cy} x2={s.x2} y2={s.y2}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}

      {/* User profile — filled */}
      <path d={profilePath} fill={`${ACCENT}22`} stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />

      {/* Vertex dots */}
      {values.map((v, i) => {
        const p = pt(v, i);
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={ACCENT} />;
      })}

      {/* Labels */}
      {labelPositions.map(({ x, y, anchor, label, value }, i) => (
        <g key={i}>
          <text
            x={x} y={y - 5}
            textAnchor={anchor as any}
            fontSize={10}
            fontWeight="600"
            fill="rgba(148,163,184,0.9)"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          >
            {label}
          </text>
          <text
            x={x} y={y + 8}
            textAnchor={anchor as any}
            fontSize={10}
            fontWeight="700"
            fill={ACCENT}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          >
            {Math.round(value * 100)}
          </text>
        </g>
      ))}
    </svg>
  );
}
