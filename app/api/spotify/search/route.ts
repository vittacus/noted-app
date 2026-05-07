import { NextRequest, NextResponse } from "next/server";
import { getSpotifyToken } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const type = request.nextUrl.searchParams.get("type") || "track,album";

  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const token = await getSpotifyToken();
    // Spotify client credentials flow caps limit at 10
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=10&market=US`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Spotify search failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
