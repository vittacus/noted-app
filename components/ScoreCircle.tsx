interface Props {
  score: number;
  size?: number;
}

export default function ScoreCircle({ score, size = 44 }: Props) {
  const fontSize = Math.round(size * 0.3);
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: "#000" }}
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
