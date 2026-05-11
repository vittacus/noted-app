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
          <span className="text-4xl font-black text-[#4fa8ff] tracking-tight">noted</span>
          <p className="text-[#8686AC] text-sm mt-2">Rate the music you love</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#2D2D6B] rounded-3xl border border-[#8686AC]/20 p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-100">Sign in</h1>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div>
            <label className="text-xs font-semibold text-[#8686AC] uppercase tracking-wide block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-3 rounded-xl border border-[#8686AC]/30 bg-[#505081]/20 text-sm text-slate-100 placeholder-[#8686AC]/60 focus:outline-none focus:ring-2 focus:ring-[#4fa8ff]/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8686AC] uppercase tracking-wide block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-3 rounded-xl border border-[#8686AC]/30 bg-[#505081]/20 text-sm text-slate-100 placeholder-[#8686AC]/60 focus:outline-none focus:ring-2 focus:ring-[#4fa8ff]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#4fa8ff]/50 text-white font-semibold text-sm hover:bg-[#3a90f0] transition-colors shadow-lg shadow-[#4fa8ff]/20 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[#8686AC] mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#4fa8ff] font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
