import { NextRequest, NextResponse } from "next/server";
import { getSpotifyToken } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const track_ids = request.nextUrl.searchParams.get("track_ids");
  if (!track_ids) return NextResponse.json({ error: "Missing track_ids" }, { status: 400 });

  console.log("[recommendations] seed track_ids:", track_ids);

  try {
    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/recommendations?seed_tracks=${track_ids}&limit=20&market=US`;
    console.log("[recommendations] fetching:", url);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log("[recommendations] Spotify status:", res.status);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[recommendations] Spotify error:", JSON.stringify(body));
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    console.log("[recommendations] tracks returned:", data.tracks?.length ?? 0);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[recommendations] caught error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
