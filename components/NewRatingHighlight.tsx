"use client";

import { useEffect } from "react";

/** Reads a sessionStorage flag set by RecommendedTracks after a successful rating
 *  and flashes the first feed card to draw attention to the new entry. */
export default function NewRatingHighlight() {
  useEffect(() => {
    const ts = sessionStorage.getItem("new_rating_ts");
    if (!ts) return;
    const age = Date.now() - parseInt(ts, 10);
    if (age > 4000) { sessionStorage.removeItem("new_rating_ts"); return; }

    sessionStorage.removeItem("new_rating_ts");

    // Give the DOM a tick to settle after router.refresh()
    const timer = setTimeout(() => {
      const firstCard = document.querySelector("[data-rating-card]");
      if (firstCard) {
        firstCard.classList.add("flash-new-rating");
        firstCard.addEventListener("animationend", () => {
          firstCard.classList.remove("flash-new-rating");
        }, { once: true });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
