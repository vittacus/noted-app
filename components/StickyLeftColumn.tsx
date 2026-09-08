"use client";

import { useEffect, useRef, useState } from "react";

const TOP_OFFSET = 88; // 5.5rem — matches nav height

export default function StickyLeftColumn({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(false);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    function update() {
      const el = wrapperRef.current;
      if (!el || window.innerWidth < 768) {
        setFixed(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      // rect.left maps directly to CSS left — no scrollbar correction needed
      setLeft(rect.left);
      setWidth(rect.width);
      setFixed(rect.top <= TOP_OFFSET);
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="mb-8 md:mb-0">
      <div
        style={
          fixed
            ? { position: "fixed", top: TOP_OFFSET, left, width }
            : {}
        }
      >
        {children}
      </div>
    </div>
  );
}
