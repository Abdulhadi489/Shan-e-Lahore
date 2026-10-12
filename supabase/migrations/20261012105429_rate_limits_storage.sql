-- Used only by Edge Functions (service_role). key is a hash of the action plus IP or phone.
create table public.rate_limits (
  key text not null check (char_length(key) <= 128),
  window_start timestamptz not null,
  count integer not null default 1 check (count >= 1),
  primary key (key, window_start)
);
create index rate_limits_window_start_idx on public.rate_limits (window_start);

grant select, insert, update, delete on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;
-- No policies: anon and authenticated have no grants and no access.

-- Public-read bucket for menu photos and banners; only super_admin uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png']);

-- Reading public files goes through the public URL and needs no policy. Upserts need
-- select + insert + update.
create policy "super_admin reads menu images" on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-images' and (select private.is_super_admin()));
create policy "super_admin uploads menu images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-images' and (select private.is_super_admin()));
create policy "super_admin replaces menu images" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-images' and (select private.is_super_admin()))
  with check (bucket_id = 'menu-images' and (select private.is_super_admin()));
create policy "super_admin deletes menu images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-images' and (select private.is_super_admin()));
