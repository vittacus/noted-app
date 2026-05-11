"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Collection {
  id: string;
  name: string;
  song_count: number;
}

export default function CollectionsSection({ userId }: { userId: string }) {
  const supabase = createClient();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("collections")
      .select("id, name, collection_songs(count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) {
      setCollections(
        data.map((c: any) => ({
          id: c.id,
          name: c.name,
          song_count: c.collection_songs?.[0]?.count ?? 0,
        }))
      );
    }
  }

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    const { data } = await supabase
      .from("collections")
      .insert({ user_id: userId, name: newName.trim() })
      .select("id, name")
      .single();
    if (data) {
      setCollections((prev) => [{ ...data, song_count: 0 }, ...prev]);
      setNewName("");
      setShowInput(false);
    }
    setCreating(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-base text-slate-100">Collections</h2>
        <button
          onClick={() => setShowInput((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[#4fa8ff] font-semibold hover:opacity-80 transition-opacity"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 50))}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Collection name…"
            className="flex-1 px-3 py-2.5 rounded-xl border border-[#505081]/60 bg-[#505081]/20 text-sm text-slate-100 placeholder-[#8686AC]/50 focus:outline-none focus:ring-2 focus:ring-[#4fa8ff]/50"
          />
          <button
            onClick={create}
            disabled={!newName.trim() || creating}
            className="px-4 py-2.5 rounded-xl bg-[#4fa8ff]/20 text-[#4fa8ff] text-sm font-semibold hover:bg-[#4fa8ff]/30 transition-colors disabled:opacity-40"
          >
            {creating ? "…" : "Create"}
          </button>
        </div>
      )}

      {collections.length === 0 && !showInput && (
        <p className="text-xs text-[#8686AC]/75 py-2">No collections yet. Tap + New to create one.</p>
      )}

      <div className="space-y-2">
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/collection/${col.id}`}
            className="flex items-center gap-3 bg-[#272757] rounded-2xl p-3 border border-[#505081]/40 hover:border-[#505081]/60 transition-colors block"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4fa8ff]/10 border border-[#4fa8ff]/20 flex items-center justify-center shrink-0">
              <FolderOpen size={18} className="text-[#4fa8ff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-100 truncate">{col.name}</p>
              <p className="text-xs text-[#8686AC] mt-0.5">{col.song_count} song{col.song_count !== 1 ? "s" : ""}</p>
            </div>
            <span className="text-xs text-[#8686AC]/75">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
