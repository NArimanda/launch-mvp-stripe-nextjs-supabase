-- Posts: live on insert, no draft/publish flags.
-- Run in Supabase SQL editor or via migration.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  teaser_image_url text,
  body text not null default '',
  author_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "posts_select_public"
  on public.posts for select
  using (true);

create policy "posts_insert_admin"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_admin is true
    )
  );
