-- Every menu row carries branch_id so RLS can scope staff to their branch with one check.
-- Composite foreign keys (child_id, branch_id) keep a child in the same branch as its parent.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, branch_id)
);
create index categories_branch_id_idx on public.categories (branch_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  category_id uuid not null,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  description_en text not null default '' check (char_length(description_en) <= 300),
  description_ur text not null default '' check (char_length(description_ur) <= 300),
  base_price integer not null check (base_price >= 0),
  image_path text check (char_length(image_path) <= 200),
  is_available boolean not null default true,
  is_hidden boolean not null default false,
  is_deal boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, branch_id),
  foreign key (category_id, branch_id) references public.categories (id, branch_id)
);
create index items_category_id_idx on public.items (category_id, branch_id);
create index items_branch_id_idx on public.items (branch_id);

create table public.item_variants (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  item_id uuid not null,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  price integer not null check (price >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, item_id),
  foreign key (item_id, branch_id) references public.items (id, branch_id) on delete cascade
);
create index item_variants_item_id_idx on public.item_variants (item_id, branch_id);
create index item_variants_branch_id_idx on public.item_variants (branch_id);

-- A group is required when min_select >= 1.
create table public.addon_groups (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, branch_id),
  check (min_select <= max_select)
);
create index addon_groups_branch_id_idx on public.addon_groups (branch_id);

create table public.addon_options (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  group_id uuid not null,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  extra_price integer not null default 0 check (extra_price >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (group_id, branch_id) references public.addon_groups (id, branch_id) on delete cascade
);
create index addon_options_group_id_idx on public.addon_options (group_id, branch_id);
create index addon_options_branch_id_idx on public.addon_options (branch_id);

create table public.item_addon_groups (
  item_id uuid not null,
  group_id uuid not null,
  branch_id uuid not null,
  sort_order integer not null default 0,
  primary key (item_id, group_id),
  foreign key (item_id, branch_id) references public.items (id, branch_id) on delete cascade,
  foreign key (group_id, branch_id) references public.addon_groups (id, branch_id) on delete cascade
);
create index item_addon_groups_item_idx on public.item_addon_groups (item_id, branch_id);
create index item_addon_groups_group_idx on public.item_addon_groups (group_id, branch_id);
create index item_addon_groups_branch_id_idx on public.item_addon_groups (branch_id);

-- A deal is an item with is_deal = true; these rows are its fixed contents.
create table public.deal_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  deal_item_id uuid not null,
  item_id uuid not null,
  variant_id uuid,
  quantity integer not null check (quantity between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deal_item_id <> item_id),
  foreign key (deal_item_id, branch_id) references public.items (id, branch_id) on delete cascade,
  foreign key (item_id, branch_id) references public.items (id, branch_id),
  -- the variant must belong to the contained item
  foreign key (variant_id, item_id) references public.item_variants (id, item_id)
);
create index deal_items_deal_idx on public.deal_items (deal_item_id, branch_id);
create index deal_items_item_idx on public.deal_items (item_id, branch_id);
create index deal_items_variant_idx on public.deal_items (variant_id, item_id);
create index deal_items_branch_id_idx on public.deal_items (branch_id);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  image_path text not null check (char_length(image_path) <= 200),
  title_en text not null default '' check (char_length(title_en) <= 80),
  title_ur text not null default '' check (char_length(title_ur) <= 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index banners_branch_id_idx on public.banners (branch_id);

create trigger set_updated_at before update on public.categories
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.items
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.item_variants
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.addon_groups
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.addon_options
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.deal_items
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.banners
  for each row execute function extensions.moddatetime(updated_at);

-- Price changes are audited.
create trigger audit after insert or update or delete on public.items
  for each row execute function private.write_audit_log();
create trigger audit after insert or update or delete on public.item_variants
  for each row execute function private.write_audit_log();
create trigger audit after insert or update or delete on public.addon_options
  for each row execute function private.write_audit_log();

-- Staff may mark things sold out; everything else on these rows is super_admin only.
create trigger staff_only_toggle_availability before update on public.items
  for each row execute function private.restrict_columns_unless_super_admin('is_available');
create trigger staff_only_toggle_availability before update on public.item_variants
  for each row execute function private.restrict_columns_unless_super_admin('is_available');
create trigger staff_only_toggle_availability before update on public.addon_options
  for each row execute function private.restrict_columns_unless_super_admin('is_available');

grant select on
  public.categories, public.items, public.item_variants, public.addon_groups,
  public.addon_options, public.item_addon_groups, public.deal_items, public.banners
  to anon, authenticated;
grant insert, update, delete on
  public.categories, public.items, public.item_variants, public.addon_groups,
  public.addon_options, public.item_addon_groups, public.deal_items, public.banners
  to authenticated;
grant select, insert, update, delete on
  public.categories, public.items, public.item_variants, public.addon_groups,
  public.addon_options, public.item_addon_groups, public.deal_items, public.banners
  to service_role;

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_variants enable row level security;
alter table public.addon_groups enable row level security;
alter table public.addon_options enable row level security;
alter table public.item_addon_groups enable row level security;
alter table public.deal_items enable row level security;
alter table public.banners enable row level security;

-- Customers see active categories and visible items in them. Staff see everything in their
-- branch, including hidden items. Child rows follow their parent's visibility because the
-- subqueries below are themselves filtered by the parent table's RLS.
create policy "public reads active categories; staff read their branch" on public.categories
  for select to anon, authenticated
  using (is_active or private.is_staff_of(branch_id));
create policy "public reads visible items; staff read their branch" on public.items
  for select to anon, authenticated
  using (
    (not is_hidden and exists (select 1 from public.categories c where c.id = category_id))
    or private.is_staff_of(branch_id)
  );
create policy "variants follow their item" on public.item_variants
  for select to anon, authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy "anyone reads addon groups" on public.addon_groups
  for select to anon, authenticated
  using (true);
create policy "anyone reads addon options" on public.addon_options
  for select to anon, authenticated
  using (true);
create policy "item addon links follow their item" on public.item_addon_groups
  for select to anon, authenticated
  using (exists (select 1 from public.items i where i.id = item_id));
create policy "deal contents follow their deal" on public.deal_items
  for select to anon, authenticated
  using (exists (select 1 from public.items i where i.id = deal_item_id));
create policy "public reads active banners; staff read their branch" on public.banners
  for select to anon, authenticated
  using (is_active or private.is_staff_of(branch_id));

create policy "super_admin inserts categories" on public.categories
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates categories" on public.categories
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes categories" on public.categories
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts items" on public.items
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "staff update items in their branch" on public.items
  for update to authenticated
  using (private.is_staff_of(branch_id)) with check (private.is_staff_of(branch_id));
create policy "super_admin deletes items" on public.items
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts variants" on public.item_variants
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "staff update variants in their branch" on public.item_variants
  for update to authenticated
  using (private.is_staff_of(branch_id)) with check (private.is_staff_of(branch_id));
create policy "super_admin deletes variants" on public.item_variants
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts addon groups" on public.addon_groups
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates addon groups" on public.addon_groups
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes addon groups" on public.addon_groups
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts addon options" on public.addon_options
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "staff update addon options in their branch" on public.addon_options
  for update to authenticated
  using (private.is_staff_of(branch_id)) with check (private.is_staff_of(branch_id));
create policy "super_admin deletes addon options" on public.addon_options
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts item addon links" on public.item_addon_groups
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates item addon links" on public.item_addon_groups
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes item addon links" on public.item_addon_groups
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts deal contents" on public.deal_items
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates deal contents" on public.deal_items
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes deal contents" on public.deal_items
  for delete to authenticated using ((select private.is_super_admin()));

create policy "super_admin inserts banners" on public.banners
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates banners" on public.banners
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes banners" on public.banners
  for delete to authenticated using ((select private.is_super_admin()));
