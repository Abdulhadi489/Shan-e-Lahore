-- Fonts of the customer website, chosen by the Super Admin in Settings > Fonts and read by every visitor.
-- Additive only: one new table, nothing existing is touched. Safe to run twice.
-- The allowed fonts below must match englishFonts and urduFonts in src/lib/fonts.ts; the test in
-- src/lib/fonts.test.ts compares them, so a font added to one list and not the other fails CI.
-- To allow another font later, add a new migration that replaces the matching check and add the font to fonts.ts.
begin;

-- One row only: the primary key is the constant true.
create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  font_heading_en text not null default 'Cormorant Garamond',
  font_body_en text not null default 'Jost',
  font_heading_ur text not null default 'Noto Nastaliq Urdu',
  font_body_ur text not null default 'Noto Nastaliq Urdu',
  updated_at timestamptz not null default now(),
  constraint site_settings_english_fonts_allowed check (
    font_heading_en in (
    'Cormorant Garamond',
    'Playfair Display',
    'Lora',
    'Merriweather',
    'Libre Baskerville',
    'Cinzel',
    'EB Garamond',
    'Crimson Text',
    'DM Serif Display',
    'Bitter',
    'Abril Fatface',
    'Spectral',
    'Jost',
    'Poppins',
    'Montserrat',
    'Raleway',
    'Lato',
    'Open Sans',
    'Roboto',
    'Nunito',
    'Nunito Sans',
    'Inter',
    'Work Sans',
    'DM Sans',
    'Mulish',
    'Source Sans 3',
    'Karla',
    'Rubik',
    'Oswald',
    'Bebas Neue',
    'Barlow',
    'Barlow Condensed',
    'PT Sans',
    'PT Sans Narrow',
    'Josefin Sans',
    'Quicksand',
    'Cabin'
    )
    and font_body_en in (
    'Cormorant Garamond',
    'Playfair Display',
    'Lora',
    'Merriweather',
    'Libre Baskerville',
    'Cinzel',
    'EB Garamond',
    'Crimson Text',
    'DM Serif Display',
    'Bitter',
    'Abril Fatface',
    'Spectral',
    'Jost',
    'Poppins',
    'Montserrat',
    'Raleway',
    'Lato',
    'Open Sans',
    'Roboto',
    'Nunito',
    'Nunito Sans',
    'Inter',
    'Work Sans',
    'DM Sans',
    'Mulish',
    'Source Sans 3',
    'Karla',
    'Rubik',
    'Oswald',
    'Bebas Neue',
    'Barlow',
    'Barlow Condensed',
    'PT Sans',
    'PT Sans Narrow',
    'Josefin Sans',
    'Quicksand',
    'Cabin'
    )
  ),
  constraint site_settings_urdu_fonts_allowed check (
    font_heading_ur in (
    'Noto Nastaliq Urdu',
    'Gulzar',
    'Noto Naskh Arabic',
    'Noto Sans Arabic',
    'Amiri',
    'Lateef',
    'Scheherazade New',
    'Harmattan'
    )
    and font_body_ur in (
    'Noto Nastaliq Urdu',
    'Gulzar',
    'Noto Naskh Arabic',
    'Noto Sans Arabic',
    'Amiri',
    'Lateef',
    'Scheherazade New',
    'Harmattan'
    )
  )
);

create or replace trigger set_updated_at before update on public.site_settings
  for each row execute function extensions.moddatetime(updated_at);

-- The default row, so the website has something to read from day one.
insert into public.site_settings (id) values (true) on conflict (id) do nothing;

-- Everyone may read the four font columns (and only those: select * is refused by anon); only a Super Admin may write.
-- No delete for anyone through the API.
revoke all on public.site_settings from anon, authenticated;
grant select (font_heading_en, font_body_en, font_heading_ur, font_body_ur) on public.site_settings to anon, authenticated;
-- A logged-in admin's update filters on id (update ... where id), which needs the right to read that column.
grant select (id) on public.site_settings to authenticated;
grant insert (font_heading_en, font_body_en, font_heading_ur, font_body_ur) on public.site_settings to authenticated;
grant update (font_heading_en, font_body_en, font_heading_ur, font_body_ur) on public.site_settings to authenticated;
grant select, insert, update, delete on public.site_settings to service_role;
alter table public.site_settings enable row level security;

-- CREATE POLICY has no IF NOT EXISTS, so each one is created only when it is missing.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings' and policyname = 'anyone reads site settings') then
    create policy "anyone reads site settings" on public.site_settings
      for select to anon, authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings' and policyname = 'super_admin inserts site settings') then
    create policy "super_admin inserts site settings" on public.site_settings
      for insert to authenticated
      with check ((select private.is_super_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings' and policyname = 'super_admin updates site settings') then
    create policy "super_admin updates site settings" on public.site_settings
      for update to authenticated
      using ((select private.is_super_admin()))
      with check ((select private.is_super_admin()));
  end if;
end
$$;

commit;
