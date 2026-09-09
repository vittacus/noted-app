/**
 * Fetches real Spotify album art URLs for the demo account's songs.
 * Prints verified UPDATE statements to stdout and writes seed_demo.sql.
 *
 * Run from project root:
 *   node scripts/backfill-demo-album-art.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env.local ──────────────────────────────────────────────────────────
const env = {};
try {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { console.error("Could not read .env.local"); process.exit(1); }

const CLIENT_ID     = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing Spotify credentials"); process.exit(1);
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Token failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function lookupTrack(token, title, artist) {
  const q = `track:${title} artist:${artist}`;
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1&market=US`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  const track = data.tracks?.items?.[0];
  return track?.album?.images?.[0]?.url ?? null;
}

// Songs that need a real Spotify lookup (others reuse confirmed friend-account URLs)
const TO_FETCH = [
  { id: "seed_dm_01", title: "Redbone",                           artist: "Childish Gambino" },
  { id: "seed_dm_02", title: "Location",                          artist: "Khalid"            },
  { id: "seed_dm_03", title: "HUMBLE.",                           artist: "Kendrick Lamar"    },
  { id: "seed_dm_04", title: "drivers license",                   artist: "Olivia Rodrigo"    },
  { id: "seed_dm_05", title: "good 4 u",                          artist: "Olivia Rodrigo"    },
  { id: "seed_dm_06", title: "Motion Sickness",                   artist: "Phoebe Bridgers"   },
  { id: "seed_dm_07", title: "Dynamite",                          artist: "BTS"               },
  { id: "seed_dm_08", title: "Easy On Me",                        artist: "Adele"             },
  { id: "seed_dm_09", title: "As It Was",                         artist: "Harry Styles"      },
  { id: "seed_dm_10", title: "Golden Hour",                       artist: "JVKE"              },
  { id: "seed_dm_11", title: "Tusa",                              artist: "Karol G"           },
  { id: "seed_dm_12", title: "Essence",                           artist: "Wizkid"            },
  { id: "seed_dm_13", title: "MONTERO (Call Me By Your Name)",    artist: "Lil Nas X"         },
];

// Art URLs already confirmed working via backfill_album_art.sql
const REUSED = {
  // Nights, Die For You → same album as Ivy/Blinding Lights/Broken Clocks/EARFQUAKE/cardigan
  "seed_dm_r1": "https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526", // Blonde (Frank Ocean)
  "seed_dm_r2": "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36", // After Hours (The Weeknd)
  "seed_dm_r3": "https://i.scdn.co/image/ab67616d0000b27306d56b057cce5797538a16d5", // Ctrl (SZA)
  "seed_dm_r4": "https://i.scdn.co/image/ab67616d0000b27330a635de2bb0caa4e26f6abb", // IGOR (Tyler)
  "seed_dm_r5": "https://i.scdn.co/image/ab67616d0000b27395f754318336a07e85ec59bc", // folklore (Taylor Swift)
};

async function main() {
  console.log("Getting Spotify token…");
  const token = await getToken();
  console.log("Looking up new songs…\n");

  const artMap = { ...REUSED };
  let found = 0, missing = 0;

  for (const s of TO_FETCH) {
    process.stdout.write(`  ${s.id}  ${s.title} — ${s.artist} … `);
    try {
      const url = await lookupTrack(token, s.title, s.artist);
      if (url) { artMap[s.id] = url; found++; process.stdout.write("✓\n"); }
      else      { artMap[s.id] = null; missing++; process.stdout.write("✗ not found\n"); }
    } catch (e) { artMap[s.id] = null; missing++; process.stdout.write(`✗ ${e.message}\n`); }
  }

  console.log(`\n${found}/${TO_FETCH.length} fetched, ${missing} missing`);

  // Write results as JSON for the SQL template to consume
  const outPath = join(ROOT, "scripts", "_demo_art_urls.json");
  writeFileSync(outPath, JSON.stringify(artMap, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
