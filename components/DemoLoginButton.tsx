"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DemoLoginButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const { error } = await supabase.auth.signInWithPassword({
            email: process.env.NEXT_PUBLIC_DEMO_EMAIL!,
            password: process.env.NEXT_PUBLIC_DEMO_PASSWORD!,
          });
          if (error) {
            setLoading(false);
          } else {
            router.push("/");
            router.refresh();
          }
        }}
        className="px-7 py-3.5 border border-[#117ACA]/35 bg-[#117ACA]/8 text-[#117ACA] font-bold text-sm rounded-2xl hover:bg-[#117ACA]/15 hover:border-[#117ACA]/60 transition-all duration-200 disabled:opacity-50"
      >
        {loading ? "Loading demo…" : "Try Demo Account"}
      </button>
      <p className="text-xs text-white/30">Explore as a sample user — no sign-up needed</p>
    </div>
  );
}
