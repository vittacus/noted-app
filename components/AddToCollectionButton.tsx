"use client";

import { useState, useEffect } from "react";
import { FolderPlus, X, Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Collection {
  id: string;
  name: string;
}

export default function AddToCollectionButton({ songId }: { songId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  async function loadCollections() {
    if (!userId) return;
    setLoading(true);
    const { data: cols } = await supabase
      .from("collections")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setCollections(cols ?? []);

    if (cols?.length) {
      const { data: membership } = await supabase
        .from("collection_songs")
        .select("collection_id")
        .in("collection_id", cols.map((c) => c.id))
        .eq("song_id", songId);
      setMemberOf(new Set((membership ?? []).map((m: any) => m.collection_id)));
    }
    setLoading(false);
  }

  async function toggle(collectionId: string) {
    if (!userId) return;
    if (memberOf.has(collectionId)) {
      await supabase.from("collection_songs")
        .delete()
        .eq("collection_id", collectionId)
        .eq("song_id", songId);
      setMemberOf((s) => { const n = new Set(s); n.delete(collectionId); return n; });
    } else {
      await supabase.from("collection_songs").insert({ collection_id: collectionId, song_id: songId });
      setMemberOf((s) => new Set([...s, collectionId]));
    }
  }

  async function createCollection() {
    if (!newName.trim() || !userId) return;
    setCreating(true);
    const { data } = await supabase
      .from("collections")
      .insert({ user_id: userId, name: newName.trim() })
      .select("id, name")
      .single();
    if (data) {
      setCollections((prev) => [data, ...prev]);
      setNewName("");
      // Auto-add song to the new collection
      await supabase.from("collection_songs").insert({ collection_id: data.id, song_id: songId });
      setMemberOf((s) => new Set([...s, data.id]));
    }
    setCreating(false);
  }

  if (!userId) return null;

  return (
    <>
      <button
        onClick={() => { setOpen(true); loadCollections(); }}
        className="w-full h-12 rounded-2xl border border-[#8686AC]/30 text-[#8686AC] text-sm font-semibold hover:bg-[#505081]/20 transition-colors flex items-center justify-center gap-2"
      >
        <FolderPlus size={16} /> Add to collection
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#2D2D6B] rounded-t-3xl border-t border-[#8686AC]/20 p-5 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-100">Add to collection</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-[#505081]/30 flex items-center justify-center hover:bg-[#505081]/50 transition-colors">
                <X size={14} className="text-[#8686AC]" />
              </button>
            </div>

            {/* Create new */}
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value.slice(0, 50))}
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                placeholder="New collection name…"
                className="flex-1 px-3 py-2.5 rounded-xl border border-[#8686AC]/30 bg-[#505081]/20 text-sm text-slate-100 placeholder-[#8686AC]/50 focus:outline-none focus:ring-2 focus:ring-[#4fa8ff]/50"
              />
              <button
                onClick={createCollection}
                disabled={!newName.trim() || creating}
                className="px-3.5 py-2.5 rounded-xl bg-[#4fa8ff]/20 text-[#4fa8ff] text-sm font-semibold hover:bg-[#4fa8ff]/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Plus size={14} /> Create
              </button>
            </div>

            {/* Existing collections */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading && <p className="text-xs text-[#8686AC]/75 text-center py-4">Loading…</p>}
              {!loading && collections.length === 0 && (
                <p className="text-xs text-[#8686AC]/75 text-center py-4">No collections yet. Create one above.</p>
              )}
              {collections.map((col) => {
                const inCollection = memberOf.has(col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => toggle(col.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      inCollection
                        ? "border-[#4fa8ff]/40 bg-[#4fa8ff]/10"
                        : "border-[#8686AC]/20 bg-[#505081]/20 hover:border-[#8686AC]/30"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      inCollection ? "border-[#4fa8ff] bg-[#4fa8ff]" : "border-[#8686AC]/40"
                    }`}>
                      {inCollection && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-slate-200">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
