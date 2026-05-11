"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: { username: string } | null;
}

export default function RatingComments({ ratingId }: { ratingId: string }) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Table health check — if this errors, the table doesn't exist yet
    supabase.from("comments").select("count", { count: "exact", head: true })
      .then(({ count: c, error }) => {
        if (error) {
          console.error("[comments] TABLE HEALTH CHECK FAILED:", error.message,
            "\n→ Run the schema SQL in Supabase Dashboard → SQL Editor");
        } else {
          console.log(`[comments] table OK — ${c ?? 0} total rows`);
          // Now fetch count for this specific rating
          supabase.from("comments").select("id", { count: "exact", head: true })
            .eq("rating_id", ratingId)
            .then(({ count: rc }) => setCount(rc ?? 0));
        }
      });
    // Check auth status
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
  }, [ratingId]);

  async function loadComments() {
    if (expanded) { setExpanded(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user:users(username)")
      .eq("rating_id", ratingId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) ?? []);
    setCount(data?.length ?? 0);
    setExpanded(true);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    // Guard: ratingId must be a non-empty string
    if (!ratingId || ratingId === "undefined") {
      setError("Cannot save comment — rating ID is missing.");
      console.error("[comments] missing ratingId prop, got:", ratingId);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in to comment.");
      setSubmitting(false);
      return;
    }

    console.log("[comments] inserting: ratingId=", ratingId, "userId=", user.id);

    const { data, error: insertErr } = await supabase
      .from("comments")
      .insert({ rating_id: ratingId, user_id: user.id, content: trimmed })
      .select("id, content, created_at, user:users(username)")
      .single();

    if (insertErr) {
      // Show the actual Supabase error so it's visible during debugging
      const msg = insertErr.message.includes("relation")
        ? "Comments table not found — run the schema migration in Supabase."
        : insertErr.message;
      setError(msg);
      console.error("[comments] insert error:", insertErr.message, "| ratingId:", ratingId);
    } else if (data) {
      setComments((c) => [...c, data as unknown as Comment]);
      setCount((c) => (c ?? 0) + 1);
      setText("");
      setExpanded(true);
    }
    setSubmitting(false);
  }

  const label = count === null ? ""
    : count === 0 ? "Add a comment"
    : `${count} comment${count !== 1 ? "s" : ""}`;

  return (
    <div className="px-4 pb-3">
      <button onClick={loadComments}
        className="flex items-center gap-1.5 text-xs text-[#8686AC]/75 hover:text-[#8686AC] transition-colors">
        <MessageCircle size={12} />
        {loading ? "Loading…" : label}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {comments.length === 0 && !submitting && (
            <p className="text-xs text-[#8686AC]/55 italic">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="text-xs font-semibold text-[#4fa8ff] shrink-0 mt-0.5">
                {c.user?.username ?? "?"}
              </span>
              <p className="text-xs text-[#8686AC] leading-relaxed">{c.content}</p>
            </div>
          ))}

          {error && <p className="text-xs text-rose-400">{error}</p>}

          {isLoggedIn ? (
            <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 text-xs bg-[#505081]/20 border border-[#8686AC]/30 rounded-xl px-3 py-2 text-slate-200 placeholder-[#8686AC]/50 focus:outline-none focus:ring-1 focus:ring-[#4fa8ff]/50"
              />
              <button type="submit" disabled={!text.trim() || submitting}
                className="w-8 h-8 rounded-xl bg-[#4fa8ff]/10 border border-[#4fa8ff]/20 flex items-center justify-center hover:bg-[#4fa8ff]/20 transition-colors disabled:opacity-40">
                <Send size={12} className="text-[#4fa8ff]" />
              </button>
            </form>
          ) : (
            <p className="text-xs text-[#8686AC]/55 mt-1">
              <a href="/auth/login" className="text-[#4fa8ff] hover:underline">Sign in</a> to comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
