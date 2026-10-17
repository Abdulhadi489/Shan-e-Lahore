-- A home banner may open a dish when tapped (Menu > Home banners). The composite key keeps the dish in the
-- banner's branch; deleting the dish only clears the link. Existing grants and RLS on banners cover the column.
alter table public.banners add column item_id uuid;
alter table public.banners
  add constraint banners_item_id_fkey foreign key (item_id, branch_id)
  references public.items (id, branch_id) on delete set null (item_id);
create index banners_item_id_idx on public.banners (item_id, branch_id);
