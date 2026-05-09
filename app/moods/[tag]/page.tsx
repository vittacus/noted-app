"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ScoreCircle from "@/components/ScoreCircle";

export default function MoodDetailPage() {
  const { tag } = useParams<{ tag: string }>();
  const moodName = decodeURIComponent(tag);
  const router = useRouter();
  const supabase = createClient();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("ratings")
        .select("id, overall_score, best_for_tags, song:songs(id, title, artist, album_art_url, album_name)")
        .eq("user_id", user.id)
        .contains("best_for_tags", [moodName]);

      // Sort by score descending
      const sorted = (data ?? []).sort((a: any, b: any) => b.overall_score - a.overall_score);
      setSongs(sorted);
      setLoading(false);
    }
    load();
  }, [moodName]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const displayed = showAll ? songs : songs.slice(0, 10);
  const hasMore = songs.length > 10;

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={16} className="text-slate-400" />
        </button>
        <div>
          <h1 className="font-black text-xl text-slate-100">{moodName}</h1>
          <p className="text-xs text-slate-500">{songs.length} song{songs.length !== 1 ? "s" : ""} · sorted by score</p>
        </div>
      </div>

      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-medium text-slate-400">No songs tagged with this mood</p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {displayed.map((r: any, i) => (
          <Link key={r.id} href={`/song/${r.id}`} className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5 hover:border-white/10 transition-colors block">
            <span className="text-sm font-black text-slate-700 w-5 text-right shrink-0">{i + 1}</span>
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {r.song?.album_art_url
                ? <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100 truncate">{r.song?.title}</p>
              <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
            </div>
            <ScoreCircle score={r.overall_score} size={40} />
          </Link>
        ))}
      </div>

      {/* See all / collapse */}
      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2.5 rounded-2xl border border-white/10 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors mb-4"
        >
          {showAll ? "Show top 10 only" : `See all ${songs.length} songs →`}
        </button>
      )}

      {/* Export placeholder */}
      <div className="relative">
        <button
          disabled
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
          className="w-full py-3 rounded-2xl border border-white/10 text-slate-600 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 opacity-50"
        >
          🎵 Export to Spotify playlist
        </button>
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1e2d3d] border border-white/10 rounded-xl text-xs text-slate-400 whitespace-nowrap shadow-lg pointer-events-none">
            Coming soon — connect your Spotify account to enable this
          </div>
        )}
      </div>
    </div>
  );
}
