-- Run in Supabase SQL editor. auth.users is managed by Supabase Auth.

create table creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  bio text,
  price_cents int not null default 500
);

-- Tiers: what a patron actually buys. `rank` is the only thing gating compares,
-- so tiers can be renamed or repriced without touching a single policy.
create table tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators on delete cascade not null,
  name text not null,
  price_cents int not null,
  rank int not null,               -- 1 = lowest paid tier
  perks text,
  unique (creator_id, rank)
);
alter table tiers enable row level security;
create policy "tiers are public" on tiers for select using (true);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  patron_id uuid references auth.users on delete cascade not null,
  creator_id uuid references creators on delete cascade not null,
  tier_id uuid references tiers on delete set null,
  -- active | paused | canceled. Paused keeps the row (and the history) but
  -- stops both billing and access, which is what "pause" has to mean.
  status text not null default 'active'
    check (status in ('active', 'paused', 'canceled')),
  interval text not null default 'month' check (interval in ('month', 'year')),
  stripe_session_id text unique,   -- idempotency: webhook can't double-insert
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
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

-- ---------------------------------------------------------------------------
-- Roles. One row per auth user; the role is the server's copy, not the client's.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'unpaid'
    check (role in ('unpaid', 'paid', 'creator', 'admin'))
);
alter table profiles enable row level security;

-- security definer: called from policies ON profiles, so it must not re-enter
-- RLS or the policy recurses into itself.
create function is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "read own profile" on profiles for select
  using (id = auth.uid() or is_admin());
-- No insert/update policy on purpose: nobody self-promotes. Role changes come
-- from the webhook (service role) or the SQL editor.

-- Signup fills the profile; 'unpaid' is the only role you get for free.
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Posts split in two: public metadata, gated body. RLS filters rows, not
-- columns, so the paywalled bytes need their own table to leave a teaser behind.
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users on delete cascade not null,
  creator_id uuid references creators on delete cascade,
  locked boolean not null default false,
  min_rank int not null default 1,      -- lowest tier rank that may read it
  teaser text,                          -- public blurb, generated below
  draft boolean not null default false,
  publish_at timestamptz,               -- server clock decides, not the browser
  unlock_at timestamptz,                -- optional: goes public on this date
  created_at timestamptz not null default now()
);

create table post_content (
  post_id uuid primary key references posts on delete cascade,
  caption text,
  image text,
  video text
);

alter table posts enable row level security;
alter table post_content enable row level security;

-- Drafts and future posts belong to their author until they are live.
create policy "published posts are listable" on posts for select using (
  author_id = auth.uid() or is_admin()
  or (not draft and (publish_at is null or publish_at <= now()))
);
-- Admins get the same write powers as the author, not just read: the admin
-- dashboard can lock, publish and delete anyone's post.
create policy "authors and admins write posts" on posts for all
  using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());

-- THE PAYWALL. A locked body is only ever sent to a patron whose active tier
-- ranks at or above the post's min_rank; everyone else gets the posts row
-- (teaser included) with no content attached.
create policy "content needs an active membership" on post_content for select using (
  exists (
    select 1 from posts p where p.id = post_id and (
      p.author_id = auth.uid() or is_admin()
      or not p.locked
      or (p.unlock_at is not null and p.unlock_at <= now())
      or exists (
        select 1 from memberships m
        join tiers t on t.id = m.tier_id
        where m.creator_id = p.creator_id
          and m.patron_id = auth.uid()
          and m.status = 'active'
          and t.rank >= p.min_rank
      )
    )
  )
);
create policy "authors and admins write content" on post_content for all using (
  exists (select 1 from posts p where p.id = post_id
          and (p.author_id = auth.uid() or is_admin()))
) with check (
  exists (select 1 from posts p where p.id = post_id
          and (p.author_id = auth.uid() or is_admin()))
);

-- Teaser is generated server-side from the gated caption, so a creator cannot
-- forget it and a client cannot forge it. ~20 words, then an ellipsis.
create function fill_teaser() returns trigger
  language plpgsql security definer set search_path = public as $$
declare words text[];
begin
  select string_to_array(regexp_replace(coalesce(new.caption, ''), '\s+', ' ', 'g'), ' ')
    into words;
  update posts set teaser = case
    when array_length(words, 1) is null then null
    when array_length(words, 1) <= 20 then array_to_string(words, ' ')
    else array_to_string(words[1:20], ' ') || '…'
  end where id = new.post_id;
  return new;
end $$;
create trigger post_content_teaser after insert or update on post_content
  for each row execute function fill_teaser();

-- Demo seed
insert into creators (name, bio, price_cents) values
  ('Ada Paints', 'Weekly watercolor studies.', 500),
  ('Lo-Fi Lab', 'Ambient tracks + stems.', 800),
  ('The Rust Diaries', 'Deep-dive systems essays.', 1200);

-- Three tiers each, priced off the creator's base price. Rank is what gates.
insert into tiers (creator_id, name, price_cents, rank, perks)
select c.id, t.name, (c.price_cents * t.mult)::int, t.rank, t.perks
from creators c, (values
  ('Supporter', 1, 1, 'Members-only posts.'),
  ('Insider',   2, 2, 'Everything above, plus works in progress.'),
  ('Studio',    5, 3, 'Everything above, plus monthly video calls.')
) as t(name, mult, rank, perks);
