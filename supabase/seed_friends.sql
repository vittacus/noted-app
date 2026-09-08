-- Seed fake friend accounts for noted-app suggested-friends feature.
-- Run this once in Supabase Dashboard → SQL Editor.
-- Safe to re-run (all inserts use ON CONFLICT DO NOTHING).

-- ── 1. Auth users ──────────────────────────────────────────────────────────────
-- The handle_new_user trigger auto-creates rows in public.users.
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_user_meta_data
) VALUES
  ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'beatmaven@noted.fake',  crypt('noted_seed_2024', gen_salt('bf')), now(), now(), now(), '{"username":"beatmaven"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','20000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'melodyghost@noted.fake', crypt('noted_seed_2024', gen_salt('bf')), now(), now(), now(), '{"username":"melodyghost"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'wavesurfer@noted.fake',  crypt('noted_seed_2024', gen_salt('bf')), now(), now(), now(), '{"username":"wavesurfer"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','40000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'lowfreq@noted.fake',     crypt('noted_seed_2024', gen_salt('bf')), now(), now(), now(), '{"username":"lowfreq"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','50000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'driftpop@noted.fake',    crypt('noted_seed_2024', gen_salt('bf')), now(), now(), now(), '{"username":"driftpop"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Defensive insert in case the trigger already fired or failed
INSERT INTO public.users (id, email, username) VALUES
  ('10000000-0000-0000-0000-000000000001', 'beatmaven@noted.fake',   'beatmaven'),
  ('20000000-0000-0000-0000-000000000001', 'melodyghost@noted.fake',  'melodyghost'),
  ('30000000-0000-0000-0000-000000000001', 'wavesurfer@noted.fake',   'wavesurfer'),
  ('40000000-0000-0000-0000-000000000001', 'lowfreq@noted.fake',      'lowfreq'),
  ('50000000-0000-0000-0000-000000000001', 'driftpop@noted.fake',     'driftpop')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Songs ───────────────────────────────────────────────────────────────────
INSERT INTO public.songs (id, spotify_id, title, artist, album_name, duration_seconds) VALUES
  -- beatmaven (Rap / Alt)
  ('10000000-0000-0000-0001-000000000001','seed_bm_01','Alright',       'Kendrick Lamar',       'To Pimp a Butterfly',         219),
  ('10000000-0000-0000-0001-000000000002','seed_bm_02','SICKO MODE',    'Travis Scott',          'ASTROWORLD',                  312),
  ('10000000-0000-0000-0001-000000000003','seed_bm_03','EARFQUAKE',     'Tyler, The Creator',    'IGOR',                        231),
  ('10000000-0000-0000-0001-000000000004','seed_bm_04','Goosebumps',    'Travis Scott',          'Birds in the Trap Sing McKnight', 243),
  ('10000000-0000-0000-0001-000000000005','seed_bm_05','Money Trees',   'Kendrick Lamar',        'good kid, m.A.A.d city',      386),
  -- melodyghost (Latin / Pop)
  ('20000000-0000-0000-0001-000000000001','seed_mg_01','Tití Me Preguntó',    'Bad Bunny',           'Un Verano Sin Ti',            197),
  ('20000000-0000-0000-0001-000000000002','seed_mg_02','La Noche de Anoche',  'Bad Bunny & ROSALÍA', 'El Último Tour Del Mundo',    196),
  ('20000000-0000-0000-0001-000000000003','seed_mg_03','Malamente',           'ROSALÍA',             'El Mal Querer',               204),
  ('20000000-0000-0000-0001-000000000004','seed_mg_04','Con Calma',           'Daddy Yankee & Snow', 'Con Calma',                   198),
  ('20000000-0000-0000-0001-000000000005','seed_mg_05','Hawái',               'Maluma',              'Papi Juancho',                187),
  -- wavesurfer (Indie / R&B)
  ('30000000-0000-0000-0001-000000000001','seed_ws_01','Ivy',           'Frank Ocean',           'Blonde',                      278),
  ('30000000-0000-0000-0001-000000000002','seed_ws_02','Good Days',     'SZA',                   'Good Days',                   399),
  ('30000000-0000-0000-0001-000000000003','seed_ws_03','Holocene',      'Bon Iver',              'Bon Iver, Bon Iver',          306),
  ('30000000-0000-0000-0001-000000000004','seed_ws_04','Novacane',      'Frank Ocean',           'Nostalgia, Ultra',            254),
  ('30000000-0000-0000-0001-000000000005','seed_ws_05','Broken Clocks', 'SZA',                   'Ctrl',                        248),
  -- lowfreq (Rap / Soul)
  ('40000000-0000-0000-0001-000000000001','seed_lf_01','No Role Modelz','J. Cole',               '2014 Forest Hills Drive',     291),
  ('40000000-0000-0000-0001-000000000002','seed_lf_02','On & On',       'Erykah Badu',           'Baduizm',                     303),
  ('40000000-0000-0000-0001-000000000003','seed_lf_03','Love Yourz',    'J. Cole',               '2014 Forest Hills Drive',     218),
  ('40000000-0000-0000-0001-000000000004','seed_lf_04','Next Lifetime', 'Erykah Badu',           'Baduizm',                     265),
  ('40000000-0000-0000-0001-000000000005','seed_lf_05','Kevin''s Heart','J. Cole',               'KOD',                         225),
  -- driftpop (Pop)
  ('50000000-0000-0000-0001-000000000001','seed_dp_01','Blinding Lights','The Weeknd',           'After Hours',                 200),
  ('50000000-0000-0000-0001-000000000002','seed_dp_02','Levitating',    'Dua Lipa',              'Future Nostalgia',            203),
  ('50000000-0000-0000-0001-000000000003','seed_dp_03','cardigan',      'Taylor Swift',          'folklore',                    239),
  ('50000000-0000-0000-0001-000000000004','seed_dp_04','Save Your Tears','The Weeknd',           'After Hours',                 215),
  ('50000000-0000-0000-0001-000000000005','seed_dp_05','New Rules',     'Dua Lipa',              'Dua Lipa',                    209)
ON CONFLICT (spotify_id) DO NOTHING;

-- ── 3. Ratings ─────────────────────────────────────────────────────────────────
INSERT INTO public.ratings
  (user_id, song_id, vibe, replay_value, lyrics, production, overall_score, genre_tags, best_for_tags, notes, listened_at, created_at)
VALUES
  -- beatmaven
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0001-000000000001','loved', 9,9,8,9.2,'{"Rap"}','{"Late Night","Focus"}',    'This song changed everything for me.',          current_date-1,  now()-'1 day'::interval),
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0001-000000000002','loved', 8,7,9,8.5,'{"Rap"}','{"Hype","Workout"}',        null,                                            current_date-3,  now()-'3 days'::interval),
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0001-000000000003','loved', 9,8,9,8.8,'{"Alternative","Rap"}','{"Chill"}',  'Tyler just doesn''t miss.',                     current_date-5,  now()-'5 days'::interval),
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0001-000000000004','liked', 8,6,8,7.9,'{"Rap"}','{"Hype"}',                  null,                                            current_date-7,  now()-'7 days'::interval),
  ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0001-000000000005','loved',10,9,8,9.0,'{"Rap"}','{"Late Night"}',            'Six minutes of pure storytelling.',             current_date-10, now()-'10 days'::interval),
  -- melodyghost
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0001-000000000001','loved', 9,8,9,9.3,'{"Latin"}','{"Hype","Road Trip"}',    'Bad Bunny era was unreal.',                     current_date-2,  now()-'2 days'::interval),
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0001-000000000002','loved', 9,9,9,9.0,'{"Latin","Pop"}','{"Chill"}',         null,                                            current_date-4,  now()-'4 days'::interval),
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0001-000000000003','loved', 8,10,9,8.9,'{"Alternative","Latin"}','{"Focus"}','The production on this is other-worldly.',      current_date-6,  now()-'6 days'::interval),
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0001-000000000004','liked', 7,6,7,7.4,'{"Latin","Pop"}','{"Road Trip"}',     null,                                            current_date-9,  now()-'9 days'::interval),
  ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0001-000000000005','liked', 8,7,7,7.8,'{"Latin","Pop"}','{"Chill"}',         null,                                            current_date-12, now()-'12 days'::interval),
  -- wavesurfer
  ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000001','loved',10,10,9,9.5,'{"R&B","Indie"}','{"Late Night"}',   'I will never recover from this song.',          current_date-1,  now()-'26 hours'::interval),
  ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000002','loved', 9,9,8,8.7,'{"R&B"}','{"Chill","Late Night"}',    null,                                            current_date-3,  now()-'3 days'::interval),
  ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000003','loved',10,8,9,9.1,'{"Indie"}','{"Focus","Late Night"}',  'Everything about this is perfect.',             current_date-6,  now()-'6 days'::interval),
  ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000004','loved', 9,9,8,8.4,'{"R&B"}','{"Late Night","Chill"}',   null,                                            current_date-8,  now()-'8 days'::interval),
  ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000005','loved', 8,9,7,8.2,'{"R&B"}','{"Chill"}',                null,                                            current_date-11, now()-'11 days'::interval),
  -- lowfreq
  ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0001-000000000001','loved', 9,8,8,9.0,'{"Rap"}','{"Late Night","Focus"}',   null,                                            current_date-2,  now()-'50 hours'::interval),
  ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0001-000000000002','loved',10,10,8,9.2,'{"Soul","R&B"}','{"Chill","Focus"}','Erykah is in a league of her own.',             current_date-4,  now()-'4 days'::interval),
  ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0001-000000000003','loved', 9,8,7,8.8,'{"Rap"}','{"Focus","Late Night"}',   'The most honest rap song ever written.',        current_date-7,  now()-'7 days'::interval),
  ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0001-000000000004','loved', 8,9,7,8.5,'{"Soul","R&B"}','{"Chill"}',         null,                                            current_date-9,  now()-'9 days'::interval),
  ('40000000-0000-0000-0000-000000000001','40000000-0000-0000-0001-000000000005','liked', 7,8,7,7.8,'{"Rap"}','{"Late Night"}',           null,                                            current_date-13, now()-'13 days'::interval),
  -- driftpop
  ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0001-000000000001','loved', 9,7,10,8.9,'{"Pop"}','{"Workout","Hype"}',       'The synths. That''s it. That''s the review.',   current_date-1,  now()-'20 hours'::interval),
  ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0001-000000000002','loved', 8,7,9,8.2,'{"Pop"}','{"Hype","Road Trip"}',      null,                                            current_date-3,  now()-'3 days'::interval),
  ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0001-000000000003','loved',10,10,8,9.0,'{"Pop","Indie"}','{"Late Night","Chill"}','Taylor in her indie era hits different.',   current_date-5,  now()-'5 days'::interval),
  ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0001-000000000004','loved', 8,7,9,8.6,'{"Pop"}','{"Hype","Workout"}',        null,                                            current_date-8,  now()-'8 days'::interval),
  ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0001-000000000005','liked', 8,6,8,7.9,'{"Pop"}','{"Road Trip"}',             null,                                            current_date-11, now()-'11 days'::interval)
ON CONFLICT (user_id, song_id) DO NOTHING;
