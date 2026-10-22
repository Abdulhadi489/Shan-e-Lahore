-- Local development data only. Never put real customer data here.
-- The menu (names, prices, Urdu) is transcribed from the restaurant's printed menu of 2026-08-29;
-- the Super Admin enters the live menu through the admin panel.
-- Branch pin: Google Maps listing "Shan-e-Lahore", Gulberg II (sent by the team, 2026-10-13).
-- Opening hours 05:00 to 23:00 every day (05:00 to midnight sent by the team 2026-10-13; closing moved to 23:00 on 2026-10-22).
-- Placeholders until the client sends real values: delivery tiers,
-- and the Urdu for categories, Half/Full and deal contents
-- (written by Claude; needs review by an Urdu speaker).

insert into public.branches (id, name_en, name_ur, address_en, address_ur, phone, lat, lng, order_prefix) values
  ('b0000000-0000-0000-0000-000000000001', 'Shan-e-Lahore', 'شانِ لاہور',
   '113 D Main Market, Near Rizwan Burger, Gulberg II, Lahore', '113 ڈی مین مارکیٹ، نزد رضوان برگر، گلبرگ II، لاہور',
   '924235242650', 31.523689, 74.344498, 'SL');

-- No minimum order (team decision, 2026-10-13); the Super Admin can set one later.
insert into public.branch_settings (branch_id, min_order_amount, free_delivery_threshold) values
  ('b0000000-0000-0000-0000-000000000001', 0, null);

insert into public.delivery_tiers (branch_id, upper_km, charge) values
  ('b0000000-0000-0000-0000-000000000001', 3, 100),
  ('b0000000-0000-0000-0000-000000000001', 5, 150),
  ('b0000000-0000-0000-0000-000000000001', 7, 200);

insert into public.opening_hours (branch_id, weekday, open_time, close_time)
select 'b0000000-0000-0000-0000-000000000001', d, '05:00', '23:00' from generate_series(0, 6) d;

insert into public.categories (branch_id, name_en, name_ur, sort_order)
select 'b0000000-0000-0000-0000-000000000001', name_en, name_ur, sort_order from (values
  ('Special Deals', 'اسپیشل ڈیلز', 1),
  ('Mutton & Beef Karahi', 'مٹن اور بیف کڑاہی', 2),
  ('Chicken Karahi', 'چکن کڑاہی', 3),
  ('Afghani', 'افغانی', 4),
  ('Bar-B.Q.', 'باربی کیو', 5),
  ('Tawa Taka Tak', 'توا ٹکا ٹک', 6),
  ('Desi Handi', 'دیسی ہانڈی', 7),
  ('Fish', 'مچھلی', 8),
  ('Rice', 'چاول', 9),
  ('Desi Nashta', 'دیسی ناشتہ', 10),
  ('Tandoor', 'تندور', 11),
  ('Raita & Salad', 'رائتہ اور سلاد', 12)
) c(name_en, name_ur, sort_order);

-- One row per dish. variants: [name_en, name_ur, price] in display order; base_price is the lowest price.
create temporary table seed_menu (
  sort_order serial,
  category text not null,
  name_en text not null,
  name_ur text not null,
  base_price integer not null,
  variants jsonb not null default '[]',
  is_featured boolean not null default false
);

insert into seed_menu (category, name_en, name_ur, base_price, variants, is_featured) values
  ('Mutton & Beef Karahi', 'Mutton Karahi', 'مٹن کڑاہی', 2500, '[["Half","ہاف",2500],["Full","فل",4800]]', true),
  ('Mutton & Beef Karahi', 'Mutton Makhni Karahi', 'مٹن مکھنی کڑاہی', 2600, '[["Half","ہاف",2600],["Full","فل",5000]]', false),
  ('Mutton & Beef Karahi', 'Mutton White Karahi', 'مٹن وائٹ کڑاہی', 2700, '[["Half","ہاف",2700],["Full","فل",5200]]', false),
  ('Mutton & Beef Karahi', 'Mutton Boneless Karahi', 'مٹن بونلیس کڑاہی', 3000, '[["Half","ہاف",3000],["Full","فل",6000]]', false),
  ('Mutton & Beef Karahi', 'Mutton Boneless Makhni Karahi', 'مٹن بونلیس مکھنی کڑاہی', 3200, '[["Half","ہاف",3200],["Full","فل",6400]]', false),
  ('Mutton & Beef Karahi', 'Mutton Boneless White Karahi', 'مٹن بونلیس وائٹ کڑاہی', 3400, '[["Half","ہاف",3400],["Full","فل",6600]]', false),
  ('Mutton & Beef Karahi', 'Mutton Desi Ghee Karahi', 'مٹن دیسی گھی کڑاہی', 2700, '[["Half","ہاف",2700],["Full","فل",5400]]', false),
  ('Mutton & Beef Karahi', 'Beef Karahi', 'بیف کڑاہی', 1800, '[["Half","ہاف",1800],["Full","فل",3500]]', false),

  ('Chicken Karahi', 'Chicken Karahi', 'چکن کڑاہی', 1150, '[["Half","ہاف",1150],["Full","فل",2200]]', true),
  ('Chicken Karahi', 'Chicken Makhni Karahi', 'چکن مکھنی کڑاہی', 1400, '[["Half","ہاف",1400],["Full","فل",2700]]', false),
  ('Chicken Karahi', 'Chicken Boneless Karahi', 'چکن بونلیس کڑاہی', 1600, '[["Half","ہاف",1600],["Full","فل",3100]]', false),
  ('Chicken Karahi', 'Chicken Makhni Boneless Karahi', 'چکن مکھنی بونلیس کڑاہی', 1700, '[["Half","ہاف",1700],["Full","فل",3200]]', false),
  ('Chicken Karahi', 'Desi Chicken Karahi', 'دیسی چکن کڑاہی', 2600, '[["Half","ہاف",2600],["Full","فل",5000]]', false),
  ('Chicken Karahi', 'Desi Chicken Makhni Karahi', 'دیسی چکن مکھنی کڑاہی', 2700, '[["Half","ہاف",2700],["Full","فل",5300]]', false),
  ('Chicken Karahi', 'Chicken White Karahi', 'چکن وائٹ کڑاہی', 1450, '[["Half","ہاف",1450],["Full","فل",2800]]', false),
  ('Chicken Karahi', 'Chicken White Boneless Karahi', 'چکن وائٹ بونلیس کڑاہی', 1700, '[["Half","ہاف",1700],["Full","فل",3200]]', false),
  ('Chicken Karahi', 'Chicken Black Pepper Karahi', 'چکن کالی مرچ کڑاہی', 1250, '[["Half","ہاف",1250],["Full","فل",2300]]', false),

  ('Afghani', 'Mutton Shinwari Karahi', 'مٹن شنواری کڑاہی', 2600, '[["Half","ہاف",2600],["Full","فل",5000]]', false),
  ('Afghani', 'Dunba Shinwari Karahi', 'دنبہ شنواری کڑاہی', 2600, '[["Half","ہاف",2600],["Full","فل",5000]]', false),
  ('Afghani', 'Chicken Shinwari Karahi', 'چکن شنواری کڑاہی', 1400, '[["Half","ہاف",1400],["Full","فل",2600]]', false),

  ('Bar-B.Q.', 'Mutton Seekh Champ', 'مٹن سیخ چانپ', 2700, '[["Half (6 pcs)","ہاف (6 پیس)",2700],["Full (12 pcs)","فل (12 پیس)",5400]]', false),
  ('Bar-B.Q.', 'Mutton Tika Boti', 'مٹن تکہ بوٹی', 3000, '[["Half (4 pcs)","ہاف (4 پیس)",3000],["Full (8 pcs)","فل (8 پیس)",6000]]', false),
  ('Bar-B.Q.', 'Chicken Malai Boti', 'چکن ملائی بوٹی', 1350, '[["Half (3 pcs)","ہاف (3 پیس)",1350],["Full (6 pcs)","فل (6 پیس)",2700]]', true),
  ('Bar-B.Q.', 'Chicken Tika Boti', 'چکن تکہ بوٹی', 1200, '[["Half (4 pcs)","ہاف (4 پیس)",1200],["Full (8 pcs)","فل (8 پیس)",2400]]', false),
  ('Bar-B.Q.', 'Chicken Cheese Boti', 'چکن چیز بوٹی', 1350, '[["Half (3 pcs)","ہاف (3 پیس)",1350],["Full (6 pcs)","فل (6 پیس)",2700]]', false),
  ('Bar-B.Q.', 'Chicken Rajastani Boti', 'چکن راجستانی بوٹی', 1350, '[["Half (3 pcs)","ہاف (3 پیس)",1350],["Full (6 pcs)","فل (6 پیس)",2700]]', false),
  ('Bar-B.Q.', 'Chicken Reshmi Kabab', 'چکن ریشمی کباب', 1600, '[["Half (4 pcs)","ہاف (4 پیس)",1600],["Full (8 pcs)","فل (8 پیس)",3200]]', false),
  ('Bar-B.Q.', 'Chicken Kabab', 'چکن کباب', 960, '[["Half (4 pcs)","ہاف (4 پیس)",960],["Full (8 pcs)","فل (8 پیس)",1920]]', false),
  ('Bar-B.Q.', 'Chicken Cheese Kabab', 'چکن چیز کباب', 1280, '[["Half (4 pcs)","ہاف (4 پیس)",1280],["Full (8 pcs)","فل (8 پیس)",2560]]', false),
  ('Bar-B.Q.', 'Chicken Gola Kabab', 'چکن گولہ کباب', 1000, '[["Half (2 pcs)","ہاف (2 پیس)",1000],["Full (4 pcs)","فل (4 پیس)",2000]]', false),
  ('Bar-B.Q.', 'Beef Kabab', 'بیف کباب', 1000, '[["Half (4 pcs)","ہاف (4 پیس)",1000],["Full (8 pcs)","فل (8 پیس)",2000]]', false),
  ('Bar-B.Q.', 'Beef Cheese Kabab', 'بیف چیز کباب', 1320, '[["Half (4 pcs)","ہاف (4 پیس)",1320],["Full (8 pcs)","فل (8 پیس)",2640]]', false),
  ('Bar-B.Q.', 'Beef Gola Kabab', 'بیف گولہ کباب', 1100, '[["Half (2 pcs)","ہاف (2 پیس)",1100],["Full (4 pcs)","فل (4 پیس)",2200]]', false),
  ('Bar-B.Q.', 'Mutton Kabab', 'مٹن کباب', 1200, '[["Half (3 pcs)","ہاف (3 پیس)",1200],["Full (6 pcs)","فل (6 پیس)",2400]]', false),
  ('Bar-B.Q.', 'Mutton Cheese Kabab', 'مٹن چیز کباب', 1350, '[["Half (3 pcs)","ہاف (3 پیس)",1350],["Full (6 pcs)","فل (6 پیس)",2700]]', false),
  ('Bar-B.Q.', 'Chicken Tika Boneless', 'چکن تکہ بونلیس', 1400, '[["Half (4 pcs)","ہاف (4 پیس)",1400],["Full (8 pcs)","فل (8 پیس)",2800]]', false),
  ('Bar-B.Q.', 'Chicken Piece (Leg/Breast)', 'چکن پیس (لیگ/بریسٹ)', 480, '[]', false),
  ('Bar-B.Q.', 'Chicken Malai Piece', 'چکن ملائی پیس', 650, '[]', false),

  ('Tawa Taka Tak', 'Shan-e-Lahore Special Taka Tak', 'شانِ لاہور سپیشل ٹکا ٹک', 2700, '[]', true),
  ('Tawa Taka Tak', 'Mutton Chanp Masala', 'مٹن چانپ مصالحہ', 2200, '[]', false),
  ('Tawa Taka Tak', 'Brain Masala', 'برین مصالحہ', 1700, '[]', false),
  ('Tawa Taka Tak', 'Mutton Tawa Qeema', 'مٹن توا قیمہ', 2300, '[]', false),
  ('Tawa Taka Tak', 'Mutton Kabab Masala', 'مٹن کباب مصالحہ', 2000, '[]', false),
  ('Tawa Taka Tak', 'Chicken Kabab Masala', 'چکن کباب مصالحہ', 1700, '[]', false),
  ('Tawa Taka Tak', 'Beef Kabab Masala', 'بیف کباب مصالحہ', 1650, '[]', false),
  ('Tawa Taka Tak', 'Gurda Kapura', 'گردہ کپورہ', 1700, '[]', false),
  ('Tawa Taka Tak', 'Irani Qeema', 'ایرانی قیمہ', 1750, '[]', false),
  ('Tawa Taka Tak', 'Tawa Chatkhara Piece', 'توا چٹخارہ پیس', 700, '[]', false),
  ('Tawa Taka Tak', 'Tawa Piece Gravy', 'توا پیس گریوی', 750, '[]', false),
  ('Tawa Taka Tak', 'Tawa Piece Boneless', 'توا پیس بون لیس', 850, '[]', false),
  ('Tawa Taka Tak', 'Mughlai Tawa Piece', 'مغلائی توا پیس', 850, '[]', false),
  ('Tawa Taka Tak', 'Mughlai Tawa Boneless', 'مغلائی توا بون لیس', 950, '[]', false),
  ('Tawa Taka Tak', 'Fry Nan', 'فرائی نان', 150, '[]', false),

  ('Desi Handi', 'Mutton Qorma (Desi Ghee)', 'مٹن قورمہ (دیسی گھی)', 850, '[["Half","ہاف",850],["Full","فل",1500]]', false),
  ('Desi Handi', 'Chicken Qorma', 'چکن قورمہ', 400, '[["Half","ہاف",400],["Full","فل",790]]', false),
  ('Desi Handi', 'Mutton Palak (Desi Ghee)', 'مٹن پالک (دیسی گھی)', 850, '[["Half","ہاف",850],["Full","فل",1600]]', false),
  ('Desi Handi', 'Chicken Palak (Desi Ghee)', 'چکن پالک (دیسی گھی)', 420, '[["Half","ہاف",420],["Full","فل",820]]', false),
  ('Desi Handi', 'Chicken Qeema', 'چکن قیمہ', 450, '[["Half","ہاف",450],["Full","فل",890]]', false),
  ('Desi Handi', 'Mutton Kaleji', 'مٹن کلیجی', 450, '[["Half","ہاف",450],["Full","فل",890]]', false),
  ('Desi Handi', 'Mutton Ojiri', 'مٹن اوجری', 450, '[["Half","ہاف",450],["Full","فل",890]]', false),
  ('Desi Handi', 'Daal Mash', 'دال ماش', 280, '[["Half","ہاف",280],["Full","فل",550]]', false),
  ('Desi Handi', 'Shahi Daal (Desi Ghee)', 'شاہی دال (دیسی گھی)', 290, '[["Half","ہاف",290],["Full","فل",570]]', false),
  ('Desi Handi', 'Daal Chana', 'دال چنا', 250, '[["Half","ہاف",250],["Full","فل",490]]', false),
  ('Desi Handi', 'Sabzi Special', 'سبزی اسپیشل', 230, '[["Half","ہاف",230],["Full","فل",450]]', false),
  ('Desi Handi', 'Kari Pakora (Tue/Wed)', 'کڑی پکوڑا (منگل/بدھ)', 280, '[["Half","ہاف",280],["Full","فل",550]]', false),
  ('Desi Handi', 'Chicken Chapli Kabab (per piece)', 'چکن چپلی کباب (فی پیس)', 320, '[]', false),
  ('Desi Handi', 'Beef Chapli Kabab (per piece)', 'بیف چپلی کباب (فی پیس)', 320, '[]', false),

  -- Sold by weight on the printed menu; fixed sizes here (staff adjust on the call if needed).
  ('Fish', 'Kala Rahoo Grill Fish', 'کالا راہو گرل فش', 1400, '[["Half kg","آدھا کلو",1400],["1 kg","ایک کلو",2700]]', false),
  ('Fish', 'Boneless Grill Fish (1 kg)', 'بونلیس گرل فش (ایک کلو)', 4000, '[]', false),

  ('Rice', 'Mutton Palak Biryani', 'مٹن پالک بریانی', 800, '[["Half","ہاف",800],["Full","فل",1300]]', false),
  ('Rice', 'Chicken Palak Biryani', 'چکن پالک بریانی', 550, '[["Half","ہاف",550],["Full","فل",850]]', false),
  ('Rice', 'Chicken Biryani', 'چکن بریانی', 350, '[["Half","ہاف",350],["Full","فل",600]]', true),
  ('Rice', 'Chicken Pulao', 'چکن پلاؤ', 350, '[["Half","ہاف",350],["Full","فل",600]]', false),
  ('Rice', 'Shami Kabab', 'شامی کباب', 120, '[]', false),
  ('Rice', 'Gur Chawal', 'گڑ چاول', 200, '[["Half","ہاف",200],["Full","فل",400]]', false),
  ('Rice', 'Zarda', 'زردہ', 200, '[["Half","ہاف",200],["Full","فل",400]]', false),

  ('Desi Nashta', 'Desi Murgh Shorba', 'دیسی مرغ شوربا', 750, '[["Half","ہاف",750],["Full","فل",1500]]', false),
  ('Desi Nashta', 'Desi Murgh Chanay', 'دیسی مرغ چنے', 750, '[["Half","ہاف",750],["Full","فل",1500]]', false),
  ('Desi Nashta', 'Mutton Chanay', 'مٹن چنے', 750, '[["Half","ہاف",750],["Full","فل",1400]]', false),
  ('Desi Nashta', 'Murgh Chanay', 'مرغ چنے', 450, '[["Half","ہاف",450],["Full","فل",900]]', false),
  ('Desi Nashta', 'Mutton Paye', 'مٹن پائے', 800, '[]', false),
  ('Desi Nashta', 'Bong Paye', 'بونگ پائے', 500, '[["Half","ہاف",500],["Full","فل",1000]]', false),
  ('Desi Nashta', 'Kofta Chanay', 'کوفتہ چنے', 300, '[["Half","ہاف",300],["Full","فل",600]]', false),
  ('Desi Nashta', 'Anda Chanay', 'انڈا چنے', 250, '[["Half","ہاف",250],["Full","فل",500]]', false),
  ('Desi Nashta', 'Sada Chanay', 'سادہ چنے', 200, '[["Half","ہاف",200],["Full","فل",400]]', false),
  ('Desi Nashta', 'Halwa Puri', 'حلوہ پوڑی', 300, '[["Half","ہاف",300],["Full","فل",600]]', false),
  ('Desi Nashta', 'Special Halwa', 'سپیشل حلوہ', 200, '[["Half","ہاف",200],["Full","فل",400]]', false),
  ('Desi Nashta', 'Lassi', 'لسی', 220, '[]', false),

  ('Tandoor', 'Roghni Nan', 'روغنی نان', 200, '[]', false),
  ('Tandoor', 'Garlic Nan', 'گارلک نان', 200, '[]', false),
  ('Tandoor', 'Kalonji Nan', 'کلونجی نان', 200, '[]', false),
  ('Tandoor', 'Special Kulcha', 'سپیشل کلچہ', 50, '[]', false),
  ('Tandoor', 'Chicken Qeema Nan', 'چکن قیمہ نان', 550, '[]', false),
  ('Tandoor', 'Mutton Qeema Nan', 'مٹن قیمہ نان', 1300, '[]', false),
  ('Tandoor', 'Beef Qeema Nan', 'بیف قیمہ نان', 700, '[]', false),
  ('Tandoor', 'Tandoori Paratha', 'تندوری پراٹھا', 150, '[]', false),
  ('Tandoor', 'Sada Nan', 'سادہ نان', 30, '[]', false),
  ('Tandoor', 'Khamiri Roti', 'خمیری روٹی', 30, '[]', false),
  ('Tandoor', 'Sada Roti', 'سادہ روٹی', 20, '[]', false),

  ('Raita & Salad', 'Nestle Dahi', 'نیسلے دہی', 350, '[]', false),
  ('Raita & Salad', 'Nestle Raita', 'نیسلے رائتہ', 250, '[]', false),
  ('Raita & Salad', 'Fresh Salad', 'فریش سلاد', 150, '[]', false),
  ('Raita & Salad', 'Mint Raita', 'منٹ رائتہ', 120, '[]', false),
  ('Raita & Salad', 'Firni', 'فرنی', 160, '[]', false);

insert into public.items (branch_id, category_id, name_en, name_ur, base_price, is_featured, sort_order)
select c.branch_id, c.id, m.name_en, m.name_ur, m.base_price, m.is_featured, m.sort_order
from seed_menu m join public.categories c on c.name_en = m.category;

insert into public.item_variants (branch_id, item_id, name_en, name_ur, price, sort_order)
select i.branch_id, i.id, v.value ->> 0, v.value ->> 1, (v.value ->> 2)::integer, v.ordinality
from seed_menu m
join public.items i on i.name_en = m.name_en
cross join lateral jsonb_array_elements(m.variants) with ordinality v;

-- The printed deals list single pieces (2 mutton boti, ...), not menu portions, so their contents are a description.
insert into public.items (branch_id, category_id, name_en, name_ur, description_en, description_ur, base_price, is_deal, is_featured, sort_order)
select c.branch_id, c.id, d.name_en, d.name_ur, d.description_en, d.description_ur, d.price, true, true, d.sort_order
from public.categories c, (values
  ('BBQ & Rice Platter', 'باربی کیو اور رائس پلیٹر',
   'Serves 2-3. 2 mutton boti, 2 chicken kabab, 1 leg piece, biryani rice.',
   '2-3 افراد کے لیے۔ 2 مٹن بوٹی، 2 چکن کباب، 1 لیگ پیس، بریانی رائس۔', 2850, 1),
  ('Special Chicken Platter', 'اسپیشل چکن پلیٹر',
   'Serves 2-3. 2 chicken boti, 2 malai boti, 2 rajastani boti, 3 chicken cheese kabab.',
   '2-3 افراد کے لیے۔ 2 چکن بوٹی، 2 ملائی بوٹی، 2 راجستانی بوٹی، 3 چکن چیز کباب۔', 3300, 2)
) d(name_en, name_ur, description_en, description_ur, price, sort_order)
where c.name_en = 'Special Deals';

-- Breads and raita/salad are offered as one-tap sides with every dish.
update public.categories set is_side = true where name_en in ('Tandoor', 'Raita & Salad');

-- Placeholder riders so "out for delivery" can be tried locally; the Super Admin adds real riders in Settings.
insert into public.riders (branch_id, name, phone) values
  ('b0000000-0000-0000-0000-000000000001', 'Test Rider One', '923000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'Test Rider Two', '923000000002');
