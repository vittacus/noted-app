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
    <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-5">
      {/* Everyone */}
      <button onClick={() => go("everyone")}
        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "everyone" ? "text-white shadow-sm" : "text-white/50 hover:text-slate-300"
        }`}>
        Everyone
      </button>

      {/* My ratings */}
      <button onClick={() => go("mine")}
        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "mine" ? "text-white shadow-sm" : "text-white/50 hover:text-slate-300"
        }`}>
        My ratings
      </button>

      {/* Friends — coming soon scaffold */}
      <div className="relative flex-1 group">
        <button disabled
          className="w-full py-2 text-sm font-semibold rounded-xl text-white/28 cursor-not-allowed select-none">
          Friends
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#1A1A1A] border border-white/10 rounded-xl text-xs text-white/50 whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
          Coming soon
        </div>
      </div>
    </div>
  );
}
