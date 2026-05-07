"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ScoreCircle from "@/components/ScoreCircle";

interface CollectionSong {
  id: string;      // collection_songs row id
  song: {
    id: string;
    title: string;
    artist: string;
    album_art_url: string | null;
    album_name: string;
    duration_seconds: number;
  };
  overall_score: number | null;
  rating_id: string | null;
}

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [songs, setSongs] = useState<CollectionSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: col } = await supabase
        .from("collections")
        .select("name, user_id")
        .eq("id", collectionId)
        .single();
      if (!col) { router.push("/profile"); return; }
      setName(col.name);
      setIsOwner(user?.id === col.user_id);

      const { data: cs } = await supabase
        .from("collection_songs")
        .select("id, song:songs(id, title, artist, album_art_url, album_name, duration_seconds)")
        .eq("collection_id", collectionId);

      if (cs?.length && user) {
        const songIds = cs.map((r: any) => r.song?.id).filter(Boolean);
        const { data: ratings } = await supabase
          .from("ratings")
          .select("id, song_id, overall_score")
          .eq("user_id", user.id)
          .in("song_id", songIds);

        const ratingMap = new Map<string, { score: number; id: string }>();
        ratings?.forEach((r: any) => ratingMap.set(r.song_id, { score: r.overall_score, id: r.id }));

        const enriched: CollectionSong[] = (cs as any[]).map((r) => ({
          id: r.id,
          song: r.song,
          overall_score: ratingMap.get(r.song?.id)?.score ?? null,
          rating_id: ratingMap.get(r.song?.id)?.id ?? null,
        }));

        enriched.sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0));
        setSongs(enriched);
      } else {
        setSongs([]);
      }
      setLoading(false);
    }
    load();
  }, [collectionId]);

  async function removeFromCollection(collectionSongId: string) {
    await supabase.from("collection_songs").delete().eq("id", collectionSongId);
    setSongs((prev) => prev.filter((s) => s.id !== collectionSongId));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={16} className="text-slate-400" />
        </button>
        <div>
          <h1 className="font-black text-xl text-slate-100">{name}</h1>
          <p className="text-xs text-slate-500">{songs.length} song{songs.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Song list */}
      {songs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium text-slate-400">No songs yet</p>
          <p className="text-xs text-slate-600 mt-1">Add songs from any song detail page</p>
          <Link href="/library" className="text-[#4fc3f7] text-sm font-semibold hover:underline mt-3 block">Browse library →</Link>
        </div>
      )}

      <div className="space-y-2 mb-6">
        {songs.map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-3 bg-[#1e2d3d] rounded-2xl p-3 border border-white/5">
            <span className="text-sm font-black text-slate-700 w-5 text-right shrink-0">{i + 1}</span>
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white/5 shrink-0">
              {entry.song.album_art_url
                ? <Image src={entry.song.album_art_url} alt={entry.song.album_name} fill className="object-cover" sizes="44px" />
                : <div className="w-full h-full bg-gradient-to-br from-[#050e1a] to-[#0a1f35]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100 truncate">
                {entry.rating_id
                  ? <Link href={`/song/${entry.rating_id}`} className="hover:text-[#4fc3f7] transition-colors">{entry.song.title}</Link>
                  : entry.song.title}
              </p>
              <p className="text-xs text-slate-500 truncate">{entry.song.artist}</p>
            </div>
            {entry.overall_score !== null
              ? <ScoreCircle score={entry.overall_score} size={38} />
              : <span className="text-xs text-slate-600 shrink-0">—</span>}
            {isOwner && (
              <button onClick={() => removeFromCollection(entry.id)} className="ml-1 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-rose-500/20 transition-colors shrink-0">
                <Trash2 size={12} className="text-slate-500 hover:text-rose-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Export placeholder — #6 */}
      <div className="relative">
        <button
          disabled
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
          className="w-full py-3 rounded-2xl border border-white/10 text-slate-600 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 opacity-50"
        >
          <span>🎵</span> Export to Spotify playlist
        </button>
        {tooltipVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1e2d3d] border border-white/10 rounded-xl text-xs text-slate-400 whitespace-nowrap shadow-lg">
            Coming soon — connect your Spotify account to enable this
          </div>
        )}
      </div>
    </div>
  );
}
