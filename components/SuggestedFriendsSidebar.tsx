"use client";

import { useState } from "react";

const SUGGESTED_FRIENDS = [
  { username: "beatmaven",   initials: "BM", color: "#f59e0b", match: 94, genre: "Rap / Alt"    },
  { username: "melodyghost", initials: "MG", color: "#ec4899", match: 88, genre: "Latin / Pop"  },
  { username: "wavesurfer",  initials: "WS", color: "#F5A623", match: 82, genre: "Indie / R&B"  },
  { username: "lowfreq",     initials: "LF", color: "#a78bfa", match: 79, genre: "Rap / Soul"   },
];

export default function SuggestedFriendsSidebar() {
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function toggle(username: string) {
    setFollowing((prev) => {
      const next = new Set(prev);
      next.has(username) ? next.delete(username) : next.add(username);
      return next;
    });
  }

  return (
    <div className="bg-[#111111] rounded-2xl border border-white/8 p-4">
      <p className="text-sm font-bold text-slate-100 mb-3">Suggested friends</p>
      <div className="space-y-0.5">
        {SUGGESTED_FRIENDS.map((f) => {
          const isFollowing = following.has(f.username);
          return (
            <div key={f.username} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                style={{ backgroundColor: `${f.color}20`, color: f.color }}
              >
                {f.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{f.username}</p>
                <p className="text-xs text-white/38 truncate">{f.genre}</p>
              </div>
              <button
                onClick={() => toggle(f.username)}
                className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  isFollowing
                    ? "text-[#F5A623] border border-[#F5A623]/40 bg-[#F5A623]/10 hover:bg-[#F5A623]/15"
                    : "text-white/50 border border-white/15 hover:text-white/80 hover:border-white/25"
                }`}
              >
                {isFollowing ? "Following ✓" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
