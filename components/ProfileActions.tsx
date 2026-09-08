"use client";

import { useState } from "react";
import { Share2, Settings, X, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  username: string | null;
}

export default function ProfileActions({ username }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${username ?? "Profile"} on Noted`, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      <div className="flex gap-2">
        {/* Share */}
        <div className="relative">
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors"
            title="Share profile"
          >
            <Share2 size={15} className="text-white/50" />
          </button>
          {copied && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#2d2f52] border border-white/10 rounded-xl text-xs text-white/80 whitespace-nowrap shadow-lg pointer-events-none z-20">
              Link copied ✓
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors"
          title="Settings"
        >
          <Settings size={15} className="text-white/50" />
        </button>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="w-full max-w-sm bg-[#252748] rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-100">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/8 transition-colors"
              >
                <X size={14} className="text-white/50" />
              </button>
            </div>

            {/* Edit profile — placeholder */}
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8 opacity-50 cursor-not-allowed select-none">
              <User size={16} className="text-white/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/70">Edit profile</p>
                <p className="text-xs text-white/38 mt-0.5">Coming soon</p>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors text-left"
            >
              <LogOut size={16} className="text-white/50 shrink-0" />
              <span className="text-sm font-semibold text-white/70">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
