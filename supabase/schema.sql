-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- MIGRATION: run this if you already created the songs table without spotify_album_id
alter table public.songs add column if not exists spotify_album_id text;

-- MIGRATION: ELO rating system (run once on existing DB)
-- Adds elo_score to ratings. Legacy rows get ELO derived from their existing overall_score.
alter table public.ratings add column if not exists elo_score integer;
update public.ratings set elo_score = round(overall_score * 200) where elo_score is null;

-- USERS
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null
);
alter table public.users enable row level security;
create policy "Users can view all profiles" on public.users for select using (true);
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- SONGS
create table if not exists public.songs (
  id uuid default uuid_generate_v4() primary key,
  spotify_id text unique not null,
  title text not null,
  artist text not null,
  album_name text not null,
  album_art_url text,
  duration_seconds integer not null default 0,
  created_at timestamptz default now() not null
);
alter table public.songs enable row level security;
create policy "Songs are viewable by all" on public.songs for select using (true);
create policy "Authenticated users can insert songs" on public.songs for insert with check (auth.role() = 'authenticated');

-- ALBUMS
create table if not exists public.albums (
  id uuid default uuid_generate_v4() primary key,
  spotify_album_id text unique not null,
  title text not null,
  artist text not null,
  album_art_url text,
  release_year integer not null,
  created_at timestamptz default now() not null
);
alter table public.albums enable row level security;
create policy "Albums are viewable by all" on public.albums for select using (true);
create policy "Authenticated users can insert albums" on public.albums for insert with check (auth.role() = 'authenticated');

-- RATINGS
create table if not exists public.ratings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  song_id uuid references public.songs(id) on delete cascade not null,
  vibe text check (vibe in ('loved', 'liked', 'didnt_like')) not null,
  replay_value integer check (replay_value between 1 and 10) not null,
  lyrics integer check (lyrics between 1 and 10) not null,
  production integer check (production between 1 and 10) not null,
  overall_score numeric(4,1) check (overall_score between 1.0 and 10.0) not null,
  notes text,
  best_for_tags text[] default '{}',
  genre_tags text[] default '{}',
  listened_at date default current_date not null,
  created_at timestamptz default now() not null,
  unique (user_id, song_id)
);
alter table public.ratings enable row level security;
create policy "Ratings are viewable by all" on public.ratings for select using (true);
create policy "Users can insert their own ratings" on public.ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own ratings" on public.ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own ratings" on public.ratings for delete using (auth.uid() = user_id);

-- ALBUM RATINGS
create table if not exists public.album_ratings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  album_id uuid references public.albums(id) on delete cascade not null,
  manual_overall_score numeric(4,1) check (manual_overall_score between 1.0 and 10.0),
  calculated_score numeric(4,1) check (calculated_score between 1.0 and 10.0),
  created_at timestamptz default now() not null,
  unique (user_id, album_id)
);
alter table public.album_ratings enable row level security;
create policy "Album ratings viewable by all" on public.album_ratings for select using (true);
create policy "Users can insert their own album ratings" on public.album_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own album ratings" on public.album_ratings for update using (auth.uid() = user_id);

-- COMPARISONS
create table if not exists public.comparisons (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  winner_song_id uuid references public.songs(id) on delete cascade not null,
  loser_song_id uuid references public.songs(id) on delete cascade not null,
  created_at timestamptz default now() not null
);
alter table public.comparisons enable row level security;
create policy "Comparisons viewable by all" on public.comparisons for select using (true);
create policy "Users can insert their own comparisons" on public.comparisons for insert with check (auth.uid() = user_id);

-- FOLLOWS
create table if not exists public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (follower_id, following_id),
  check (follower_id != following_id)
);
alter table public.follows enable row level security;
create policy "Follows viewable by all" on public.follows for select using (true);
create policy "Users can manage their own follows" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can delete their own follows" on public.follows for delete using (auth.uid() = follower_id);

-- ⚠️  REQUIRED: Run this block in Supabase Dashboard → SQL Editor before comments will work
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  rating_id uuid references public.ratings(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);
alter table public.comments enable row level security;
create policy "Anyone can read comments"     on public.comments for select using (true);
create policy "Users can insert own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can insert their own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own comments" on public.comments for delete using (auth.uid() = user_id);

-- COLLECTIONS
create table if not exists public.collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null check (char_length(name) > 0 and char_length(name) <= 50),
  created_at timestamptz default now() not null
);
alter table public.collections enable row level security;
create policy "Collections viewable by all" on public.collections for select using (true);
create policy "Users can insert their own collections" on public.collections for insert with check (auth.uid() = user_id);
create policy "Users can update their own collections" on public.collections for update using (auth.uid() = user_id);
create policy "Users can delete their own collections" on public.collections for delete using (auth.uid() = user_id);

-- COLLECTION SONGS
create table if not exists public.collection_songs (
  id uuid default uuid_generate_v4() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  song_id uuid references public.songs(id) on delete cascade not null,
  added_at timestamptz default now() not null,
  unique (collection_id, song_id)
);
alter table public.collection_songs enable row level security;
create policy "Collection songs viewable by all" on public.collection_songs for select using (true);
create policy "Collection owners can insert songs" on public.collection_songs for insert
  with check (exists (select 1 from public.collections where id = collection_id and user_id = auth.uid()));
create policy "Collection owners can remove songs" on public.collection_songs for delete
  using (exists (select 1 from public.collections where id = collection_id and user_id = auth.uid()));

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
