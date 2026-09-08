"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SUGGESTED_FRIENDS = [
  { id: "10000000-0000-0000-0000-000000000001", username: "beatmaven",   initials: "BM", color: "#f59e0b", match: 94, genre: "Rap / Alt"   },
  { id: "20000000-0000-0000-0000-000000000001", username: "melodyghost", initials: "MG", color: "#ec4899", match: 88, genre: "Latin / Pop"  },
  { id: "30000000-0000-0000-0000-000000000001", username: "wavesurfer",  initials: "WS", color: "#117ACA", match: 82, genre: "Indie / R&B"  },
  { id: "40000000-0000-0000-0000-000000000001", username: "lowfreq",     initials: "LF", color: "#a78bfa", match: 79, genre: "Rap / Soul"   },
  { id: "50000000-0000-0000-0000-000000000001", username: "driftpop",    initials: "DP", color: "#4ade80", match: 75, genre: "Pop"          },
];

const FRIEND_IDS = SUGGESTED_FRIENDS.map((f) => f.id);

export default function SuggestedFriendsSidebar() {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", FRIEND_IDS);

      if (data) setFollowing(new Set(data.map((row: any) => row.following_id)));
    }
    init();
  }, []);

  async function toggle(friendId: string) {
    if (!currentUserId) return;
    const isFollowing = following.has(friendId);

    setFollowing((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(friendId) : next.add(friendId);
      return next;
    });

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", friendId);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: friendId });
    }
  }

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/8 p-4">
      <p className="text-sm font-bold text-slate-100 mb-3">Suggested friends</p>
      <div className="space-y-0.5">
        {SUGGESTED_FRIENDS.map((f) => {
          const isFollowing = following.has(f.id);
          return (
            <div key={f.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
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
                onClick={() => toggle(f.id)}
                disabled={!currentUserId}
                className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                  isFollowing
                    ? "text-[#117ACA] border border-[#117ACA]/40 bg-[#117ACA]/10 hover:bg-[#117ACA]/15"
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
