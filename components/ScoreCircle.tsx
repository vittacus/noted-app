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

/** Color-coded dot — no number displayed. Color signals quality at a glance. */
export default function ScoreCircle({ score, size = 44 }: Props) {
  return (
    <div
      className="shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: bgColor(score) }}
    />
  );
}
