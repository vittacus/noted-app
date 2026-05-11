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
    <div className="flex gap-1 bg-[#505081]/20 rounded-2xl p-1 mb-5">
      {/* Everyone */}
      <button onClick={() => go("everyone")}
        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "everyone" ? "bg-[#272757] text-[#4fa8ff] shadow-sm" : "text-[#8686AC] hover:text-slate-300"
        }`}>
        Everyone
      </button>

      {/* My ratings */}
      <button onClick={() => go("mine")}
        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
          tab === "mine" ? "bg-[#272757] text-[#4fa8ff] shadow-sm" : "text-[#8686AC] hover:text-slate-300"
        }`}>
        My ratings
      </button>

      {/* Friends — coming soon scaffold */}
      <div className="relative flex-1 group">
        <button disabled
          className="w-full py-2 text-sm font-semibold rounded-xl text-[#8686AC]/55 cursor-not-allowed select-none">
          Friends
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#272757] border border-[#505081]/60 rounded-xl text-xs text-[#8686AC] whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
          Coming soon
        </div>
      </div>
    </div>
  );
}
