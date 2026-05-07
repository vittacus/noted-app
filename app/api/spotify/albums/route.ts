import { NextRequest, NextResponse } from "next/server";
import { getSpotifyToken } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  try {
    const token = await getSpotifyToken();
    const res = await fetch(
      `https://api.spotify.com/v1/albums?ids=${ids}&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Spotify error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
