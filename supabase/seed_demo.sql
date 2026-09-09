-- Demo account seed for noted-app.
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
--
-- Credentials (set matching vars in .env.local and Vercel):
--   NEXT_PUBLIC_DEMO_EMAIL=demo@noted.app
--   NEXT_PUBLIC_DEMO_PASSWORD=noted_demo_2024
--
-- All album_art_url values were verified via the Spotify Search API
-- (scripts/backfill-demo-album-art.mjs) — not guessed or constructed.

-- ── 1. Auth user ──────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'demo@noted.app',
  crypt('noted_demo_2024', gen_salt('bf')),
  now(), now(), now(),
  '{"username":"noteduser"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Required for email/password sign-in — Supabase auth won't work without this row.
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  '{"sub":"d0000000-0000-0000-0000-000000000001","email":"demo@noted.app","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(), now(), now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO public.users (id, email, username) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'demo@noted.app', 'noteduser')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Songs ──────────────────────────────────────────────────────────────────
-- Art URLs for rows marked "reused" come from backfill_album_art.sql (same album,
-- already confirmed working). Others fetched fresh by backfill-demo-album-art.mjs.
INSERT INTO public.songs
  (id, spotify_id, title, artist, album_name, album_art_url, duration_seconds)
VALUES
  -- R&B
  ('d0000000-0000-0000-0001-000000000001','seed_dm_r1a','Nights',         'Frank Ocean',        'Blonde',               'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526', 307), -- reused (Blonde)
  ('d0000000-0000-0000-0001-000000000002','seed_dm_01a','Redbone',        'Childish Gambino',   'Awaken, My Love!',     'https://i.scdn.co/image/ab67616d0000b2731c29562d6e8c1f55bb1311d5', 326),
  ('d0000000-0000-0000-0001-000000000003','seed_dm_02a','Location',       'Khalid',             'American Teen',        'https://i.scdn.co/image/ab67616d0000b2734ac041e0d889d3a2608210d5', 222),
  ('d0000000-0000-0000-0001-000000000004','seed_dm_r2a','Die For You',    'The Weeknd',         'After Hours',          'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', 260), -- reused (After Hours)
  ('d0000000-0000-0000-0001-000000000005','seed_dm_r3a','The Weekend',    'SZA',                'Ctrl',                 'https://i.scdn.co/image/ab67616d0000b27306d56b057cce5797538a16d5', 144), -- reused (Ctrl)
  ('d0000000-0000-0000-0001-000000000017','seed_dm_12a','Essence',        'Wizkid',             'Made in Lagos',        'https://i.scdn.co/image/ab67616d0000b273b5b1023769a6bf19b14d66ab', 244),
  -- Rap / Alternative
  ('d0000000-0000-0000-0001-000000000006','seed_dm_03a','HUMBLE.',        'Kendrick Lamar',     'DAMN.',                'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873869699', 177),
  ('d0000000-0000-0000-0001-000000000007','seed_dm_r4a','PUPPET',         'Tyler, The Creator', 'IGOR',                 'https://i.scdn.co/image/ab67616d0000b27330a635de2bb0caa4e26f6abb', 225), -- reused (IGOR)
  ('d0000000-0000-0000-0001-000000000008','seed_dm_13a','MONTERO (Call Me By Your Name)', 'Lil Nas X', 'MONTERO',      'https://i.scdn.co/image/ab67616d0000b273f27e4bdc58ebe249a6b90da0', 138),
  -- Indie / Pop
  ('d0000000-0000-0000-0001-000000000009','seed_dm_04a','drivers license','Olivia Rodrigo',     'SOUR',                 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', 242),
  ('d0000000-0000-0000-0001-000000000010','seed_dm_05a','good 4 u',       'Olivia Rodrigo',     'SOUR',                 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a', 178),
  ('d0000000-0000-0000-0001-000000000011','seed_dm_r5a','august',         'Taylor Swift',       'folklore',             'https://i.scdn.co/image/ab67616d0000b27395f754318336a07e85ec59bc', 262), -- reused (folklore)
  ('d0000000-0000-0000-0001-000000000012','seed_dm_06a','Motion Sickness','Phoebe Bridgers',    'Stranger in the Alps', 'https://i.scdn.co/image/ab67616d0000b2736c26e4a2e4df94a55591c48f', 242),
  ('d0000000-0000-0000-0001-000000000013','seed_dm_08a','Easy On Me',     'Adele',              '30',                   'https://i.scdn.co/image/ab67616d0000b273c6b577e4c4a6d326354a89f7', 224),
  ('d0000000-0000-0000-0001-000000000014','seed_dm_09a','As It Was',      'Harry Styles',       'Harry''s House',       'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee', 157),
  ('d0000000-0000-0000-0001-000000000015','seed_dm_10a','Golden Hour',    'JVKE',               'this is what ___ feels like', 'https://i.scdn.co/image/ab67616d0000b273c2504e80ba2f258697ab2954', 209),
  -- K-Pop / Latin
  ('d0000000-0000-0000-0001-000000000016','seed_dm_07a','Dynamite',       'BTS',                'Dynamite',             'https://i.scdn.co/image/ab67616d0000b273c07d5d2fdc02ae252fcd07e5', 199),
  ('d0000000-0000-0000-0001-000000000018','seed_dm_11a','Tusa',           'Karol G',            'KG0516',               'https://i.scdn.co/image/ab67616d0000b273ddd3154c58e15a8bdb63bbcc', 231)
ON CONFLICT (spotify_id) DO NOTHING;

-- ── 3. Ratings ────────────────────────────────────────────────────────────────
-- 18 ratings spanning R&B, Rap, Indie, Pop, Alternative, K-Pop, Latin.
-- best_for_tags covers all 7 preset moods so the Moods page populates fully.
INSERT INTO public.ratings
  (id, user_id, song_id, vibe, replay_value, lyrics, production,
   overall_score, genre_tags, best_for_tags, notes, listened_at, created_at)
VALUES
  -- R&B (scores 7.8–9.5, Late Night / Chill / Heartbreak heavy)
  ('d0000000-0000-0000-0002-000000000001','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000001','loved',10,10, 9,9.5,'{"R&B"}',         '{"Late Night","Chill"}',    'Frank doesn''t miss. The transition at 1:31 breaks reality.',         current_date-2,  now()-'2 days'::interval),
  ('d0000000-0000-0000-0002-000000000002','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000002','loved', 9, 9, 9,9.0,'{"R&B"}',         '{"Late Night","Chill"}',    'One of the best songs of the decade. No debate.',                     current_date-5,  now()-'5 days'::interval),
  ('d0000000-0000-0000-0002-000000000003','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000003','liked', 7, 8, 8,7.8,'{"R&B"}',         '{"Chill"}',                 null,                                                                  current_date-9,  now()-'9 days'::interval),
  ('d0000000-0000-0000-0002-000000000004','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000004','loved', 9,10, 9,9.2,'{"R&B"}',         '{"Late Night","Heartbreak"}','This song was written for 3am drives.',                               current_date-3,  now()-'3 days'::interval),
  ('d0000000-0000-0000-0002-000000000005','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000005','loved', 9, 8, 9,8.7,'{"R&B"}',         '{"Late Night","Chill"}',    null,                                                                  current_date-12, now()-'12 days'::interval),
  ('d0000000-0000-0000-0002-000000000017','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000017','loved', 9, 9, 9,8.9,'{"R&B"}',         '{"Chill","Late Night"}',    'Wizkid and Tems just understood the assignment.',                     current_date-7,  now()-'7 days'::interval),
  -- Rap / Alternative
  ('d0000000-0000-0000-0002-000000000006','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000006','loved', 9, 9,10,9.3,'{"Rap"}',          '{"Hype","Workout"}',        'The Kung Fu Kenny era at its peak.',                                  current_date-1,  now()-'25 hours'::interval),
  ('d0000000-0000-0000-0002-000000000007','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000007','loved', 8, 9, 9,8.5,'{"Alternative","Rap"}','{"Late Night","Focus"}', null,                                                                  current_date-14, now()-'14 days'::interval),
  ('d0000000-0000-0000-0002-000000000008','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000008','loved', 8, 8, 9,8.0,'{"Rap","Pop"}',    '{"Hype"}',                  null,                                                                  current_date-18, now()-'18 days'::interval),
  -- Indie
  ('d0000000-0000-0000-0002-000000000009','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000009','loved', 8,10, 8,8.8,'{"Indie","Pop"}',  '{"Heartbreak"}',            'This song hit harder than it had any right to.',                      current_date-6,  now()-'6 days'::interval),
  ('d0000000-0000-0000-0002-000000000011','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000011','loved', 9,10, 8,9.1,'{"Indie"}',        '{"Late Night","Chill"}',    null,                                                                  current_date-10, now()-'10 days'::interval),
  ('d0000000-0000-0000-0002-000000000012','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000012','loved', 8, 9, 8,8.4,'{"Indie","Alternative"}','{"Focus","Late Night"}','Phoebe writes songs that feel like memories.',                      current_date-20, now()-'20 days'::interval),
  -- Pop
  ('d0000000-0000-0000-0002-000000000010','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000010','liked', 7, 7, 8,7.5,'{"Pop"}',          '{"Hype","Workout"}',        null,                                                                  current_date-8,  now()-'8 days'::interval),
  ('d0000000-0000-0000-0002-000000000013','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000013','loved', 8,10, 8,8.6,'{"Pop"}',          '{"Heartbreak","Chill"}',    'Adele came back and made everyone feel things.',                      current_date-15, now()-'15 days'::interval),
  ('d0000000-0000-0000-0002-000000000014','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000014','loved', 8, 8, 9,8.2,'{"Pop","Indie"}',  '{"Road Trip","Chill"}',     null,                                                                  current_date-22, now()-'22 days'::interval),
  ('d0000000-0000-0000-0002-000000000015','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000015','liked', 8, 7, 9,7.9,'{"Pop"}',          '{"Chill","Road Trip"}',     null,                                                                  current_date-25, now()-'25 days'::interval),
  -- K-Pop / Latin
  ('d0000000-0000-0000-0002-000000000016','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000016','liked', 7, 6, 9,7.2,'{"K-Pop"}',        '{"Hype","Workout"}',        null,                                                                  current_date-28, now()-'28 days'::interval),
  ('d0000000-0000-0000-0002-000000000018','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0001-000000000018','liked', 7, 7, 9,7.7,'{"Latin"}',        '{"Road Trip","Hype"}',      null,                                                                  current_date-30, now()-'30 days'::interval)
ON CONFLICT (user_id, song_id) DO NOTHING;

-- ── 4. Comments (demo comments on its own ratings) ────────────────────────────
INSERT INTO public.comments (id, rating_id, user_id, content, created_at) VALUES
  ('d0000000-0000-0000-0003-000000000001','d0000000-0000-0000-0002-000000000001','d0000000-0000-0000-0000-000000000001','Still haven''t found anything that hits like this. Frank just operates on a different level.',now()-'2 days'::interval),
  ('d0000000-0000-0000-0003-000000000002','d0000000-0000-0000-0002-000000000006','d0000000-0000-0000-0000-000000000001','DAMN. is top 5 rap albums of all time. Not up for debate.',                                   now()-'1 day'::interval),
  ('d0000000-0000-0000-0003-000000000003','d0000000-0000-0000-0002-000000000009','d0000000-0000-0000-0000-000000000001','Played this on repeat for a week straight. Worth every listen.',                              now()-'6 days'::interval),
  ('d0000000-0000-0000-0003-000000000004','d0000000-0000-0000-0002-000000000004','d0000000-0000-0000-0000-000000000001','After Hours era Weeknd was a different creature entirely.',                                   now()-'3 days'::interval)
ON CONFLICT (id) DO NOTHING;

-- ── 5. Follows beatmaven + driftpop ──────────────────────────────────────────
INSERT INTO public.follows (follower_id, following_id) VALUES
  ('d0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'), -- beatmaven
  ('d0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001')  -- driftpop
ON CONFLICT (follower_id, following_id) DO NOTHING;
