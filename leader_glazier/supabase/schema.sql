-- ============================================================
-- Leader Glazier & Furniture — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price numeric,
  discount_price numeric,
  description text,
  material text,
  dimensions text,
  colors text,
  seating_capacity text,
  stock_status text default 'in-stock',
  label text,
  is_featured boolean default false,
  is_published boolean default true,
  delivery_note text,
  whatsapp_message text,
  images text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists glass_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  image text,
  thickness text,
  price_per_sqft numeric,
  min_order_sqft numeric,
  installation_price numeric,
  frame_price_per_sqft numeric,
  is_available boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table if not exists quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone text,
  glass_type_name text,
  width numeric,
  height numeric,
  unit text,
  area_sqft numeric,
  quantity integer default 1,
  include_installation boolean default false,
  include_frame boolean default false,
  include_delivery boolean default false,
  estimated_total numeric,
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists custom_order_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  phone text,
  product_type text,
  measurements text,
  preferred_material text,
  budget text,
  location text,
  description text,
  reference_image text,
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text,
  images text[] default '{}',
  description text,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  rating integer default 5,
  comment text,
  product_type text,
  is_featured boolean default false,
  created_at timestamptz default now()
);

-- Business management
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  customer_name text,
  amount numeric not null,
  payment_method text default 'cash',
  items text,
  notes text,
  sale_date date default current_date,
  created_at timestamptz default now()
);

create table if not exists credit_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  branch text not null,
  total_amount numeric default 0,
  amount_paid numeric default 0,
  due_date date,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  branch text not null,
  category text,
  amount numeric not null,
  description text,
  expense_date date default current_date,
  created_at timestamptz default now()
);

-- CMS Management
create table if not exists accessories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price numeric not null,
  optional boolean default true,
  is_visible boolean default true,
  image text,
  description text,
  created_at timestamptz default now()
);

create table if not exists standard_sizes (
  id uuid primary key default gen_random_uuid(),
  product_type text not null,
  size_label text not null,
  width numeric,
  height numeric,
  price numeric,
  is_enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text unique not null,
  setting_value text,
  setting_type text,
  description text,
  updated_at timestamptz default now()
);

create table if not exists quote_accessories (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quote_requests(id) on delete cascade,
  accessory_id uuid references accessories(id) on delete cascade,
  quantity integer default 1,
  created_at timestamptz default now()
);

-- RLS
alter table products enable row level security;
alter table glass_types enable row level security;
alter table quote_requests enable row level security;
alter table custom_order_requests enable row level security;
alter table gallery_items enable row level security;
alter table reviews enable row level security;
alter table sales enable row level security;
alter table credit_customers enable row level security;
alter table expenses enable row level security;
alter table accessories enable row level security;
alter table standard_sizes enable row level security;
alter table site_settings enable row level security;
alter table quote_accessories enable row level security;

create policy "Public read products" on products for select using (true);
create policy "Public read glass_types" on glass_types for select using (true);
create policy "Public read gallery_items" on gallery_items for select using (true);
create policy "Public read reviews" on reviews for select using (true);
create policy "Public insert quote_requests" on quote_requests for insert with check (true);
create policy "Public insert custom_order_requests" on custom_order_requests for insert with check (true);
create policy "Public read accessories" on accessories for select using (is_visible = true);
create policy "Public read standard_sizes" on standard_sizes for select using (is_enabled = true);
create policy "Public read site_settings" on site_settings for select using (true);
create policy "Admin full products" on products for all using (true) with check (true);
create policy "Admin full glass_types" on glass_types for all using (true) with check (true);
create policy "Admin full gallery_items" on gallery_items for all using (true) with check (true);
create policy "Admin full accessories" on accessories for all using (true) with check (true);
create policy "Admin full standard_sizes" on standard_sizes for all using (true) with check (true);
create policy "Admin full site_settings" on site_settings for all using (true) with check (true);
create policy "Admin full quote_accessories" on quote_accessories for all using (true) with check (true);
create policy "Admin full reviews" on reviews for all using (true) with check (true);
create policy "Admin full quote_requests" on quote_requests for all using (true) with check (true);
create policy "Admin full custom_order_requests" on custom_order_requests for all using (true) with check (true);
create policy "Admin full sales" on sales for all using (true) with check (true);
create policy "Admin full credit_customers" on credit_customers for all using (true) with check (true);
create policy "Admin full expenses" on expenses for all using (true) with check (true);
