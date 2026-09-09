"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center page-enter">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl font-black text-[#117ACA] tracking-tight">noted</span>
          <p className="text-white/50 text-sm mt-2">Rate the music you love</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#161616] rounded-3xl border border-white/8 p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-100">Sign in</h1>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wide block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#117ACA]/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wide block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#117ACA]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#117ACA] text-black font-semibold text-sm hover:bg-[#2E93DC] transition-colors shadow-lg shadow-[#117ACA]/20 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#117ACA] font-semibold hover:underline">
            Sign up
          </Link>
        </p>

        <div className="relative mt-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0d0d0f] px-3 text-xs text-white/30">or</span>
          </div>
        </div>

        <button
          type="button"
          disabled={demoLoading}
          onClick={async () => {
            setDemoLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
              email: process.env.NEXT_PUBLIC_DEMO_EMAIL!,
              password: process.env.NEXT_PUBLIC_DEMO_PASSWORD!,
            });
            if (error) {
              setDemoLoading(false);
            } else {
              router.push("/");
              router.refresh();
            }
          }}
          className="w-full h-11 mt-4 rounded-2xl border border-[#117ACA]/30 bg-[#117ACA]/8 text-[#117ACA] font-semibold text-sm hover:bg-[#117ACA]/15 hover:border-[#117ACA]/55 transition-all duration-200 disabled:opacity-50"
        >
          {demoLoading ? "Loading demo…" : "Try Demo Account"}
        </button>
        <p className="text-center text-xs text-white/30 mt-2">Explore as a sample user — no sign-up needed</p>
      </div>
    </div>
  );
}
