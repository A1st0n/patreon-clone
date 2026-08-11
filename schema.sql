-- Run in Supabase SQL editor. auth.users is managed by Supabase Auth.

create table creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  bio text,
  price_cents int not null default 500
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  patron_id uuid references auth.users on delete cascade not null,
  creator_id uuid references creators on delete cascade not null,
  status text not null default 'active',
  stripe_session_id text unique,   -- idempotency: webhook can't double-insert
  created_at timestamptz default now(),
  unique (patron_id, creator_id)
);

-- Row Level Security: PostgREST enforces the "JWT tied to a specific user"
alter table creators enable row level security;
alter table memberships enable row level security;

create policy "creators are public" on creators for select using (true);
create policy "own memberships" on memberships
  for select using (auth.uid() = patron_id);
-- inserts happen server-side with the service role, which bypasses RLS.

-- Demo seed
insert into creators (name, bio, price_cents) values
  ('Ada Paints', 'Weekly watercolor studies.', 500),
  ('Lo-Fi Lab', 'Ambient tracks + stems.', 800),
  ('The Rust Diaries', 'Deep-dive systems essays.', 1200);
