interface Props {
  score: number;
  size?: number;
}

function bgColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#fbbf24";
  if (score >= 4) return "#fb923c";
  return "#f87171";
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
        style={{
          fontSize,
          textShadow:
            "-1px -1px 0 rgba(0,0,0,0.55), 1px -1px 0 rgba(0,0,0,0.55)," +
            "-1px  1px 0 rgba(0,0,0,0.55), 1px  1px 0 rgba(0,0,0,0.55)",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}
