noted

Overview: Rate the music you love. A full-stack music rating and discovery platform, built end-to-end as a product management portfolio project. 
From PRD to production, iterating with Claude Code through the full development lifecycle. Users rate songs across three dimensions, build a taste profile over time, and follow friends to see what they're rating.

Live App: (https://noted-app-eight.vercel.app) Try the Demo: (https://noted-app-eight.vercel.app/demo) (no sign-up required)

<img width="701" height="631" alt="Home feed screenshot" src="PLACEHOLDER_URL" /> <img width="688" height="541" alt="Rating modal screenshot" src="PLACEHOLDER_URL" /> <img width="697" height="393" alt="Profile Genre DNA screenshot" src="PLACEHOLDER_URL" />

## The Idea

Letterboxd showed that people don't just want to log what they watch, they want to rate it thoughtfully and build an identity around their taste. Nothing does this well for music. Spotify's own rating system is a binary like/dislike buried in a menu, and it doesn't capture what actually made a song work (the lyrics, the production, or just its replay value), nor does it turn a listening history into something browsable or shareable.

Noted is built around three ideas: rating should be multi-dimensional instead of a single score, a user's rating history should generate a visual taste profile rather than sit in a list, and the whole thing should feel social rather than like solo data entry.

## Features

**1. Three-dimensional rating system:** Every song is scored on Replay Value, Lyrics, and Production. It also includes a quick vibe check (whether the user loved, liked, didn't like) and a mood tag. This is the input that makes the taste profile visualizations below meaningful, rather than a single flattened score.

**2. ELO-based Battle Mode:** Users can re-rank their library by pitting two previously rated songs head to head, tournament style. An entry point for it sits on the Profile page ("Battle your top picks") to give people a reason to revisit their rankings as their taste changes.
<img width="1001" height="715" alt="Screenshot 2026-09-09 at 1 14 48 AM" src="https://github.com/user-attachments/assets/c5c0c5e8-303e-4f08-b472-3a128f505f09" />

**3. Genre DNA and Vibe DNA:** A user's rating history is aggregated into two radar charts on their profile. First, a genre breakdown of what they actually rate highly, and not just what they listen to. Second, a mood/vibe breakdown pulled from their tags. Auto generated one-line taste summaries sit alongside the charts following a users input (ex: "Low scores are rare for you, you know what you like and stick to it!")
<img width="759" height="252" alt="Screenshot 2026-09-09 at 1 15 27 AM" src="https://github.com/user-attachments/assets/8fe1306b-84c0-48b2-b4dc-04b78ec93aa4" />
<img width="759" height="249" alt="Screenshot 2026-09-09 at 1 15 42 AM" src="https://github.com/user-attachments/assets/3009ea88-3888-449f-949d-71c2debb729c" />

**4. Mood-taged collections, including user-created mood:** Songs are auto-sorted into collections (Late Night, Workout, Focus, Heartbreak, Hype, Road Trip, Chill) with score filters. A "Create Mood" flow lets users define their own mood with a custom name and icon, which then becomes selectable during rating alongside the built-in set. Each mood card renders with a fixed brand-color gradient rather than raw album art as its background, since a mood with only one or two songs could otherwise look broken depending on what that specific cover art happened to look like (a single-color album cover, for instance, made a whole card look like a rendering bug).
<img width="998" height="579" alt="Screenshot 2026-09-09 at 1 16 06 AM" src="https://github.com/user-attachments/assets/0580c5cb-1175-4725-9842-2bcf9323058b" />

**5. Community Feed** A social feed (Everyone, My Ratings, Friends tabs) shows ratings as they happen, with inline commenting backed by a relational table and row-level security.

**6. Social Graph** Follow is backed by a genuine follows table in Postgres with RLS policies, a Friends tab that queries ratings scoped to who a user actually follows, and live Follower/Following counts pulled from that same table rather than placeholder numbers. A handful of friend accounts were seeded with real rating histories so a first-time visitor sees a populated feature rather than an empty state.

**7. Multi-artist, multi-genre song metadata** Every song stores all credited artists individually, so a feature or collab credits everyone rather than just the primary artist, and up to two auto-detected genres are pulled from Spotify's artist endpoint.

**8. Library with Dual View Modes** A full library (Songs, Albums tabs) with sort (Score, Artist, Date, all bidirectional), genre filtering, and a grid/list toggle. Each song card carries a genre-coded accent color and matching tag, so the library is scannable by category at a glance
<img width="1503" height="810" alt="Screenshot 2026-09-09 at 1 16 57 AM" src="https://github.com/user-attachments/assets/12aefcbb-0238-47e8-b57a-5fc645b24deb" />

**9. Read-only Public Demo** Since this is a portfolio piece, a dedicated /demo route renders a fully-seeded example profile (18+ rated songs, populated moods, real Genre/Vibe DNA) with no login and no write actions exposed. This was originally built as an auto-login flow, then rebuilt as a read-only server-rendered view instead, since it's faster, avoids an entire class of authentication bugs, and matches what someone evaluating the project actually wants (to look, not to interact).

## Architecture

- Frontend and backend: Next.js 14 (App Router), with server components handling most data fetching.
- Database and auth: Supabase (PostgreSQL, Auth, Row-Level Security). Key tables: ratings (with artist_ids, artist_names, and genres stored as arrays, plus an elo_score column for Battle Mode), comments, follows, and moods.
- Music data: Spotify Web API, used for song search and metadata and for artist/genre lookups. No user OAuth, since the app doesn't need access to a user's actual Spotify library.
- Hosting: Vercel, auto-deploying on push to main.

## Design System

The visual identity went through three iterations before landing on the current one, documented here rather than just showing the final result.

The first version used an amber accent on a pure black background. It was clean, but read as a generic dark-mode default rather than something considered. The second version replaced it with a full warm palette (navy-plum background, coral-red accent, wine and peach as secondary colors), which fixed the genericness but introduced a new problem: two similarly saturated colors sitting next to each other clashed instead of contrasting, and the background tint made cards hard to distinguish from the page itself.

The final version returned to a near-black neutral base (#0a0a0a background, #161616 cards, #212121 secondary UI) with a single accent color, Blue (#117ACA), used the way Spotify uses its green: for primary actions, active states, and the logo, and nothing else. Functional color coding (score circles: green/yellow/orange/red; genre accents: a small curated palette) is treated as a separate system from brand color, similar to how Letterboxd separates its neutral gray UI from its green/orange/blue category accents

## Engineering Challenges

**The sticky sidebar:** Getting the right-hand sidebar to stay pinned during scroll took five iterations. CSS position: sticky silently failed for reasons that were never fully isolated. A scroll-listener plus position: fixed rewrite worked functionally but rendered the sidebar in the wrong horizontal position. The root cause turned out to be window.innerWidth including the browser's scrollbar width, while getBoundingClientRect() does not. Swapping to document.documentElement.clientWidth fixed it.

**The Supabase auth.identities gap:** Seeding realistic demo and friend accounts by inserting directly into auth.users produced accounts that existed but silently failed to authenticate (a 500 error, not the expected 400 for a nonexistent user). Modern Supabase also requires a matching row in auth.identities for email/password auth to work, which isn't obvious from the table schema alone. This was diagnosed by comparing direct API calls against a broken seeded account and a genuinely nonexistent one, which surfaced the 500 vs. 400 distinction and pointed at the real cause.

**Deprecated Spotify endpoint:** Spotify permanently deprecated the /v1/recommendations endpoint for all apps created after November 2024, meaning the original recommendation feature was quietly broken for every user. The recommendation logic was rebuilt on top of the still-supported search endpoint, using a user's top genres and most-rated artists as the seed instead of Spotify's now-defunct collaborative filtering.

## Limitations
Custom moods currently persist to local storage rather than the database, so they don't carry across devices. This was a scope decision for the demo rather than an oversight. The recommendation engine, since it can no longer use Spotify's own collaborative filtering, is a heuristic built on genre and artist overlap rather than true collaborative recommendations, so its suggestions are weaker than what Spotify's original endpoint would have produced. The social graph currently only supports one-directional following with no mutual friend or discovery beyond suggestions mechanism.

## What I'd Build Next
- Export a Mood directly to a real Spotify playlist
- An onboarding flow for first-time users ("rate 5 songs to get started")
- Move custom Moods from local storage into the database so they persist across devices
- A more robust recommendation model, potentially using a collaborative-filtering approach built on the app's own rating data rather than genre/artist heuristics

## Tech Stack
Next.js 14 · Supabase (PostgreSQL, Auth, RLS) · Spotify Web API · Tailwind CSS · Vercel

## Project Structure
```
app/page.tsx                        → home feed (Everyone / My Ratings / Friends tabs)
app/profile/page.tsx                → profile page, taste stats, Genre/Vibe DNA
app/library/page.tsx                → library, songs/albums views, sort and filter
app/moods/page.tsx                  → mood collections, including custom mood creation
app/battle/page.tsx                 → ELO-based Battle Mode
app/demo/page.tsx                   → read-only public demo profile
components/StickySidebar.tsx        → sticky positioning for the sidebar
components/SuggestedFriendsSidebar.tsx → suggested friends, follow/unfollow logic
components/RatingComments.tsx       → comment thread on a rating
supabase/                            → SQL migrations and seed scripts
```
