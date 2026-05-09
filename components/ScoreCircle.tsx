interface Props {
  score: number;
  size?: number;
}

export default function ScoreCircle({ score, size = 44 }: Props) {
  const fontSize = Math.round(size * 0.32);
  return (
    <span
      className="shrink-0 font-black text-white tabular-nums leading-none"
      style={{
        fontSize,
        textShadow:
          "-1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85), " +
          "-1px  1px 0 rgba(0,0,0,0.85), 1px  1px 0 rgba(0,0,0,0.85), " +
          "0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      {score.toFixed(1)}
    </span>
  );
}
