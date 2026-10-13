-- Categories whose dishes are offered as one-tap "Add with your order" sides (naan, raita, drinks)
-- in the dish pop-up and the cart. Set by super_admin; the existing category grants and RLS
-- policies already cover the new column (customers read it, only super_admin changes it).
alter table public.categories add column is_side boolean not null default false;
