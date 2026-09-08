"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FeedTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "everyone";

  function go(t: string) {
    if (t === "mine" && !isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="flex gap-1 mb-5">
      {/* Everyone */}
      <button onClick={() => go("everyone")}
        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "everyone" ? "bg-white/8 text-white shadow-sm" : "text-white/50 hover:text-slate-300 hover:bg-white/5"
        }`}>
        Everyone
      </button>

      {/* My ratings */}
      <button onClick={() => go("mine")}
        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "mine" ? "bg-white/8 text-white shadow-sm" : "text-white/50 hover:text-slate-300 hover:bg-white/5"
        }`}>
        My ratings
      </button>

      {/* Friends — coming soon scaffold */}
      <div className="relative group">
        <button disabled
          className="px-4 py-2 text-sm font-semibold rounded-xl text-white/28 cursor-not-allowed select-none">
          Friends
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#111111] border border-white/10 rounded-xl text-xs text-white/50 whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
          Coming soon
        </div>
      </div>
    </div>
  );
}
