-- Passwords the Super Admin may view again (Staff and riders > Show password). Only the admin-users Edge Function
-- reads or writes this table: it holds AES-GCM ciphertext, and the key is a function secret, never in the database.
-- No API role has any access, so the browser cannot read it even as a Super Admin. Additive and safe to run twice.
begin;

create table if not exists public.staff_credentials (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  ciphertext text not null check (char_length(ciphertext) between 20 and 500),
  updated_at timestamptz not null default now()
);

revoke all on public.staff_credentials from anon, authenticated;
grant select, insert, update, delete on public.staff_credentials to service_role;
alter table public.staff_credentials enable row level security;
-- No policies on purpose: with RLS on and no policy, the API roles see nothing.

commit;
