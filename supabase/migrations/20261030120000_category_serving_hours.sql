-- Daily serving hours for a category (Desi Nashta is served 04:00 to 12:00). Both empty: served whenever the
-- branch is open. An end earlier than the start runs past midnight, like opening_hours. Outside the hours the
-- category's dishes count as unavailable (place-order refuses them, the menu shows the section blurred).
-- Set by super_admin; the existing category grants and RLS policies already cover the new columns.
alter table public.categories
  add column available_from time,
  add column available_until time,
  add constraint categories_serving_hours_check check (
    (available_from is null and available_until is null)
    or (available_from is not null and available_until is not null and available_from <> available_until)
  );
