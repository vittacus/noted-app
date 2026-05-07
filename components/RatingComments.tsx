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
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch comment count on mount
  useEffect(() => {
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("rating_id", ratingId)
      .then(({ count: c }) => setCount(c ?? 0));

    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
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
    if (!text.trim() || !userId) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ rating_id: ratingId, user_id: userId, content: text.trim() })
      .select("id, content, created_at, user:users(username)")
      .single();
    if (!error && data) {
      setComments((c) => [...c, data as unknown as Comment]);
      setCount((c) => (c ?? 0) + 1);
      setText("");
    }
    setSubmitting(false);
  }

  const label = count === null ? "" : count === 0 ? "Add a comment" : `${count} comment${count !== 1 ? "s" : ""}`;

  return (
    <div className="px-4 pb-3">
      {/* Toggle */}
      <button
        onClick={loadComments}
        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        <MessageCircle size={12} />
        {loading ? "Loading…" : label}
      </button>

      {/* Comments list */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {comments.length === 0 && (
            <p className="text-xs text-slate-700 italic">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="text-xs font-semibold text-[#4fc3f7] shrink-0 mt-0.5">
                {c.user?.username ?? "?"}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">{c.content}</p>
            </div>
          ))}

          {/* Input */}
          {userId ? (
            <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/50"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="w-8 h-8 rounded-xl bg-[#4fc3f7]/10 border border-[#4fc3f7]/20 flex items-center justify-center hover:bg-[#4fc3f7]/20 transition-colors disabled:opacity-40"
              >
                <Send size={12} className="text-[#4fc3f7]" />
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-700 mt-1">
              <a href="/auth/login" className="text-[#4fc3f7] hover:underline">Sign in</a> to comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
