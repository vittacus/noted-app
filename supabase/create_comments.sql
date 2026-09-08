-- Creates the comments table with proper foreign keys and RLS.
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

create table if not exists public.comments (
  id         uuid        default gen_random_uuid() primary key,
  rating_id  uuid        not null references public.ratings(id)  on delete cascade,
  user_id    uuid        not null references public.users(id)    on delete cascade,
  content    text        not null check (char_length(content) > 0 and char_length(content) <= 500),
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

-- Drop any previously created policies (handles duplicate-policy errors on re-run)
drop policy if exists "select_comments"                  on public.comments;
drop policy if exists "insert_comments"                  on public.comments;
drop policy if exists "Users can insert their own comments" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;

create policy "select_comments"  on public.comments for select using (true);
create policy "insert_comments"  on public.comments for insert with check (auth.uid() = user_id);
create policy "delete_comments"  on public.comments for delete using (auth.uid() = user_id);
