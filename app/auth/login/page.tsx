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
          <span className="text-4xl font-black text-[#F64568] tracking-tight">noted</span>
          <p className="text-white/50 text-sm mt-2">Rate the music you love</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#252748] rounded-3xl border border-white/8 p-6 space-y-4">
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
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#F64568]/50"
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
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#F64568]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#F64568] text-black font-semibold text-sm hover:bg-[#FE9677] transition-colors shadow-lg shadow-[#F64568]/20 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#F64568] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
