import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { formatDuration, scoreColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: recentRatings } = await supabase
    .from("ratings")
    .select(`
      id, overall_score, vibe, listened_at, notes, genre_tags, best_for_tags,
      user:users(id, username, avatar_url),
      song:songs(id, title, artist, album_art_url, duration_seconds, album_name)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="page-enter">
      {/* Hero banner for logged-out users */}
      {!user && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 mb-6 text-white shadow-lg shadow-blue-200">
          <h1 className="text-2xl font-black tracking-tight mb-1">sonic</h1>
          <p className="text-blue-100 text-sm mb-4">Rate and discover music you love</p>
          <div className="flex gap-2">
            <Link href="/auth/signup" className="px-4 py-2 bg-white text-blue-600 font-semibold text-sm rounded-full hover:bg-blue-50 transition-colors">
              Get started
            </Link>
            <Link href="/auth/login" className="px-4 py-2 bg-blue-400/40 text-white font-semibold text-sm rounded-full hover:bg-blue-400/60 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-slate-900">Recent ratings</h2>
        {user && (
          <Link href="/search" className="text-sm text-blue-500 font-semibold hover:underline">
            + Rate a song
          </Link>
        )}
      </div>

      {!recentRatings?.length && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-medium">No ratings yet.</p>
          <Link href="/search" className="text-blue-500 text-sm font-semibold hover:underline mt-1 block">
            Be the first to rate a song →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {recentRatings?.map((r: any) => (
          <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            {/* User row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold text-xs overflow-hidden">
                {r.user?.avatar_url ? (
                  <Image src={r.user.avatar_url} alt={r.user.username} width={28} height={28} className="object-cover" />
                ) : (
                  (r.user?.username?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700">{r.user?.username ?? "Unknown"}</span>
              <span className="text-xs text-slate-400 ml-auto">
                {new Date(r.listened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            {/* Song row */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {r.song?.album_art_url ? (
                  <Image src={r.song.album_art_url} alt={r.song.album_name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{r.song?.title}</p>
                <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
                <div className="flex items-center gap-2 mt-1">
                  {r.genre_tags?.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
              <div className={`text-2xl font-black ${scoreColor(r.overall_score)} shrink-0`}>
                {r.overall_score.toFixed(1)}
              </div>
            </div>

            {r.notes && (
              <p className="text-xs text-slate-500 mt-3 bg-slate-50 rounded-xl px-3 py-2 italic line-clamp-2">
                &ldquo;{r.notes}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
