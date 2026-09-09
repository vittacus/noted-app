import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";
import { displayGenres } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";

const GENRE_COLORS: Record<string, string> = {
  Rap:   "#8B5CF6",
  "R&B": "#EC4899",
  Latin: "#14B8A6",
  Indie: "#22D3EE",
  Pop:   "#D946EF",
};
const GENRE_COLOR_DEFAULT = "#6B7280";

function genreColor(tags: string[]): string {
  return GENRE_COLORS[tags?.[0]] ?? GENRE_COLOR_DEFAULT;
}

export default async function DemoPage() {
  const supabase = await createClient();

  const [{ data: profile }, { data: ratings }] = await Promise.all([
    supabase.from("users").select("username").eq("id", DEMO_USER_ID).single(),
    supabase
      .from("ratings")
      .select("*, song:songs(*)")
      .eq("user_id", DEMO_USER_ID)
      .order("overall_score", { ascending: false }),
  ]);

  const totalRated = ratings?.length ?? 0;
  const avgScore =
    totalRated > 0
      ? (ratings!.reduce((s, r: any) => s + r.overall_score, 0) / totalRated).toFixed(1)
      : null;

  const genreCounts: Record<string, number> = {};
  ratings?.forEach((r: any) => {
    (r.genre_tags ?? []).forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const username = profile?.username ?? "noteduser";

  return (
    <div className="page-enter max-w-lg mx-auto">

      {/* Demo banner */}
      <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#117ACA]/10 border border-[#117ACA]/20">
        <div>
          <p className="text-sm font-semibold text-slate-100">You&apos;re exploring a demo account</p>
          <p className="text-xs text-white/50 mt-0.5">Read-only · no sign-in required</p>
        </div>
        <Link
          href="/auth/signup"
          className="shrink-0 px-4 py-2 bg-[#117ACA] text-black font-bold text-xs rounded-xl hover:bg-[#2E93DC] transition-colors"
        >
          Sign up free
        </Link>
      </div>

      {/* Profile header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-[#117ACA]/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-black text-[#117ACA]">{username[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-slate-100">{username}</p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs text-white/50">
              <span className="text-slate-200 font-semibold">{totalRated}</span> rated
            </span>
            {avgScore && (
              <span className="text-xs text-white/50">
                avg <span className="text-slate-200 font-semibold">{avgScore}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top genre chips */}
      {topGenres.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {topGenres.map((g) => {
            const c = GENRE_COLORS[g] ?? GENRE_COLOR_DEFAULT;
            return (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ backgroundColor: `${c}20`, color: c, border: `1px solid ${c}45` }}
              >
                {g}
              </span>
            );
          })}
        </div>
      )}

      {/* Library section */}
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-3">
        Library · {totalRated} songs
      </p>

      <div className="space-y-2">
        {(ratings ?? []).map((r: any) => {
          const song = r.song;
          const hasGenre = (r.genre_tags ?? []).length > 0;
          return (
            <div
              key={r.id}
              className="bg-[#161616] rounded-2xl border border-white/8 overflow-hidden"
              style={hasGenre ? { borderLeft: `4px solid ${genreColor(r.genre_tags)}` } : undefined}
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  {song.album_art_url ? (
                    <Image
                      src={song.album_art_url}
                      alt={song.album_name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#212121]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-100 truncate">{song.title}</p>
                  <p className="text-xs text-white/50 truncate">{song.artist}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {displayGenres(r.genre_tags ?? []).map((t: string) => {
                      const c = GENRE_COLORS[t] ?? GENRE_COLOR_DEFAULT;
                      return (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${c}22`, color: c }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-white/38 mt-1 line-clamp-1 italic">&ldquo;{r.notes}&rdquo;</p>
                  )}
                </div>
                <div className="shrink-0">
                  <ScoreCircle score={r.overall_score} size={44} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 mb-4">
        <Link
          href="/auth/signup"
          className="flex items-center justify-center w-full h-12 rounded-2xl bg-[#117ACA] text-black font-bold text-sm hover:bg-[#2E93DC] transition-colors shadow-lg shadow-[#117ACA]/25"
        >
          Rate your own music — it&apos;s free
        </Link>
        <p className="text-center text-xs text-white/30 mt-2">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#117ACA] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>

    </div>
  );
}
