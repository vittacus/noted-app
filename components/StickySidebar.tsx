"use client";

import { useEffect, useRef, useState } from "react";

const TOP_OFFSET = 88; // 5.5rem — matches nav height

export default function StickySidebar({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(false);
  const [right, setRight] = useState(0);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    function update() {
      const el = wrapperRef.current;
      if (!el || window.innerWidth < 768) {
        setFixed(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      // Anchor from the right edge so centering/max-width changes don't drift the sidebar
      setRight(document.documentElement.clientWidth - rect.right);
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
    <div ref={wrapperRef} className="hidden md:block">
      <div
        className="flex flex-col gap-6"
        style={
          fixed
            ? {
                position: "fixed",
                top: TOP_OFFSET,
                right,
                width,
              }
            : {}
        }
      >
        {children}
      </div>
    </div>
  );
}
