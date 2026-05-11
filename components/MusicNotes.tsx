"use client";

// All styles are fully inline — bypasses Tailwind's CSS processing pipeline
// so the keyframe animation is guaranteed to render regardless of CSS layer order.

const NOTES: [string, string, string, number, number][] = [
  ["♪", "3%",  "1.6rem", 12, 0],
  ["♫", "9%",  "1.2rem", 16, 2.5],
  ["♩", "16%", "1.8rem", 14, 5],
  ["♬", "23%", "1.1rem", 18, 1],
  ["♪", "29%", "1.4rem", 13, 8],
  ["♫", "35%", "1.9rem", 15, 3.5],
  ["♩", "41%", "1.2rem", 17, 11],
  ["♬", "47%", "1.6rem", 12, 6.5],
  ["♪", "53%", "1.3rem", 19, 0.5],
  ["♫", "59%", "1.7rem", 14, 9],
  ["♩", "65%", "1.1rem", 16, 4],
  ["♬", "71%", "1.5rem", 11, 13],
  ["♪", "77%", "1.8rem", 18, 7],
  ["♫", "83%", "1.2rem", 15, 2],
  ["♩", "89%", "1.6rem", 13, 10],
  ["♬", "94%", "1.3rem", 20, 5.5],
  ["♪", "6%",  "1.4rem", 17, 14],
  ["♫", "13%", "1.7rem", 12, 3],
  ["♩", "20%", "1.1rem", 19, 16],
  ["♬", "27%", "1.5rem", 14, 8.5],
  ["♪", "33%", "1.9rem", 16, 1.5],
  ["♫", "39%", "1.2rem", 11, 12],
  ["♩", "45%", "1.6rem", 15, 6],
  ["♬", "51%", "1.4rem", 13, 18],
  ["♪", "57%", "1.8rem", 17, 4.5],
  ["♫", "63%", "1.1rem", 20, 9.5],
  ["♩", "69%", "1.5rem", 12, 0.8],
  ["♬", "75%", "1.7rem", 16, 7.5],
  ["♪", "81%", "1.3rem", 14, 15],
  ["♫", "87%", "1.9rem", 11, 3.8],
  ["♩", "92%", "1.2rem", 18, 11.5],
  ["♬", "97%", "1.6rem", 13, 5.2],
];

const KEYFRAMES = `
  @keyframes noteDrift {
    0%   { transform: translateY(-3rem) rotate(-6deg); opacity: 0; }
    6%   { opacity: 0.17; }
    94%  { opacity: 0.17; }
    100% { transform: translateY(105vh) rotate(6deg); opacity: 0; }
  }
`;

export default function MusicNotes() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
          ariaHidden: "true",
        } as React.CSSProperties}
      >
        {NOTES.map(([char, left, fontSize, duration, delay], i) => (
          <span
            key={i}
            style={{
              position: "fixed",
              top: "-3rem",
              left,
              fontSize,
              color: "#4fa8ff",
              pointerEvents: "none",
              userSelect: "none",
              animationName: "noteDrift",
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </>
  );
}
