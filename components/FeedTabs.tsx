"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FeedTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "everyone";

  function go(t: string) {
    if ((t === "mine" || t === "friends") && !isLoggedIn) {
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
          tab === "everyone" ? "bg-[#117ACA]/15 text-white border border-[#117ACA]/25 shadow-[0_0_10px_rgba(17,122,202,0.2)]" : "text-white/50 hover:text-slate-300 hover:bg-white/5"
        }`}>
        Everyone
      </button>

      {/* My ratings */}
      <button onClick={() => go("mine")}
        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "mine" ? "bg-[#117ACA]/15 text-white border border-[#117ACA]/25 shadow-[0_0_10px_rgba(17,122,202,0.2)]" : "text-white/50 hover:text-slate-300 hover:bg-white/5"
        }`}>
        My ratings
      </button>

      {/* Friends */}
      <button onClick={() => go("friends")}
        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "friends" ? "bg-[#117ACA]/15 text-white border border-[#117ACA]/25 shadow-[0_0_10px_rgba(17,122,202,0.2)]" : "text-white/50 hover:text-slate-300 hover:bg-white/5"
        }`}>
        Friends
      </button>
    </div>
  );
}
