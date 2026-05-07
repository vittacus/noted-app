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
      {(["everyone", "mine"] as const).map((t) => (
        <button
          key={t}
          onClick={() => go(t)}
          className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
            tab === t
              ? "bg-[#1e2d3d] text-[#4fc3f7] shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {t === "everyone" ? "Everyone" : "My ratings"}
        </button>
      ))}
    </div>
  );
}
