import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { scoreColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: ratings }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("ratings")
      .select("*, song:songs(*)")
      .eq("user_id", user.id)
      .order("overall_score", { ascending: false }),
  ]);

  const totalRated = ratings?.length ?? 0;
  const avgScore = totalRated > 0
    ? (ratings!.reduce((sum, r) => sum + r.overall_score, 0) / totalRated).toFixed(1)
    : null;

  const genreCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    (r.genre_tags ?? []).forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    });
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const top5 = ratings?.slice(0, 5) ?? [];

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="page-enter">
      {/* Profile header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} width={64} height={64} className="object-cover" />
            ) : (
              (profile?.username?.[0] ?? "?").toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{profile?.username}</h1>
            <p className="text-sm text-slate-500">{profile?.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-black text-slate-900">{totalRated}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rated</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-black text-blue-500">{avgScore ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">Avg score</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center">
            <p className="text-base font-black text-slate-900 leading-tight mt-1">{topGenre ?? "—"}</p>
            <p className="text-xs text-slate-500 mt-0.5">Top genre</p>
          </div>
        </div>
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold text-base text-slate-900 mb-3">Top rated</h2>
          <div className="space-y-2">
            {top5.map((r: any, i: number) => (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                <span className="text-lg font-black text-slate-300 w-6 text-center shrink-0">{i + 1}</span>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {r.song?.album_art_url ? (
                    <Image src={r.song.album_art_url} alt={r.song.title} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{r.song?.title}</p>
                  <p className="text-xs text-slate-500 truncate">{r.song?.artist}</p>
                </div>
                <span className={`text-base font-black shrink-0 ${scoreColor(r.overall_score)}`}>
                  {r.overall_score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={handleSignOut}>
        <button
          type="submit"
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
