interface Props {
  score: number;
  size?: number;
}

function bgColor(score: number): string {
  if (score >= 8) return "#4ade80";   // green
  if (score >= 6) return "#fbbf24";   // yellow
  if (score >= 4) return "#fb923c";   // orange
  return "#f87171";                    // red
}

export default function ScoreCircle({ score, size = 44 }: Props) {
  const fontSize = Math.round(size * 0.3);
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: bgColor(score) }}
    >
      <span
        className="font-black text-white tabular-nums leading-none"
        style={{ fontSize }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}
