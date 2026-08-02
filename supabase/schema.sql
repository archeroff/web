-- Al Riyadi photo gallery schema
-- Run this in the Supabase SQL editor. Requires the pgcrypto extension (enabled by default).

-- Storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Photos table
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt text not null default '',
  sort_order bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- Settings table (holds password hashes; no read policy so it stays server-side)
create table if not exists public.settings (
  key text primary key,
  value text not null
);

alter table public.photos enable row level security;
alter table public.settings enable row level security;

-- Photos: anyone can upload (lands as pending), anyone can read approved rows
create policy "public upload" on public.photos
  for insert to anon, authenticated
  with check (true);

create policy "public read approved" on public.photos
  for select to anon, authenticated
  using (status = 'approved');

-- Seed the master password hash.
-- IMPORTANT: replace YOUR_MASTER_PASSWORD with the same value you set as the
-- ADMIN_MASTER_PASSCODE GitHub secret, then uncomment and run this once.
-- If you later rotate the secret, re-run this line with the new value.
-- insert into public.settings (key, value)
-- values ('master_password_hash', encode(digest('YOUR_MASTER_PASSWORD', 'sha256'), 'hex'));

-- Verify the admin password (server-side hash comparison, hash never leaves the DB)
create or replace function public.verify_password(pwd text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    value = encode(digest(pwd, 'sha256'), 'hex'),
    false
  )
  from public.settings
  where key = 'admin_password_hash';
$$;

-- Set/change the admin password; requires the master password
create or replace function public.set_admin_password(master text, new_pwd text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  master_hash text;
begin
  select value into master_hash from public.settings where key = 'master_password_hash';

  if master_hash is null then
    return false;
  end if;

  if encode(digest(master, 'sha256'), 'hex') <> master_hash then
    return false;
  end if;

  insert into public.settings (key, value)
  values ('admin_password_hash', encode(digest(new_pwd, 'sha256'), 'hex'))
  on conflict (key) do update set value = excluded.value;

  return true;
end;
$$;

-- Admin: list all photos (bypasses the approved-only read policy)
create or replace function public.list_photos_all()
returns table (
  id uuid,
  url text,
  alt text,
  sort_order bigint,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, url, alt, sort_order, status, created_at
  from public.photos
  order by sort_order asc, created_at desc;
$$;

-- Admin: approve a pending photo
create or replace function public.approve_photo(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.photos set status = 'approved' where id = p_id;
$$;

-- Admin: delete a photo row (storage object is removed by the client)
create or replace function public.delete_photo(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.photos where id = p_id;
$$;

-- Admin: persist the ordering of a list of photo ids
create or replace function public.update_order(ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  for i in 1..array_length(ids, 1) loop
    update public.photos set sort_order = i where id = ids[i];
  end loop;
end;
$$;

grant execute on function public.verify_password(text) to anon, authenticated;
grant execute on function public.set_admin_password(text, text) to anon, authenticated;
grant execute on function public.list_photos_all() to anon, authenticated;
grant execute on function public.approve_photo(uuid) to anon, authenticated;
grant execute on function public.delete_photo(uuid) to anon, authenticated;
grant execute on function public.update_order(uuid[]) to anon, authenticated;
