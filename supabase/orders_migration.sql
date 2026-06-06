-- ============================================================
-- Orders & Payments Table
-- Run this in your Supabase SQL editor
-- ============================================================

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),

  -- Product reference
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_image text,
  product_price numeric not null,

  -- Customer info
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_address text,

  -- Payment details
  payment_method text not null check (payment_method in ('mpesa', 'stripe')),
  payment_type text not null check (payment_type in ('full', 'deposit')),
  total_amount numeric not null,
  deposit_amount numeric default 0,
  amount_paid numeric default 0,
  balance_due numeric default 0,

  -- M-Pesa specifics
  mpesa_checkout_request_id text,
  mpesa_receipt_number text,

  -- Stripe specifics
  stripe_payment_intent_id text,
  stripe_receipt_url text,

  -- Status
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'partial', 'failed', 'refunded')),
  order_status text default 'new' check (order_status in ('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),

  -- Notes
  admin_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster lookups
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_order_status on orders(order_status);
create index if not exists idx_orders_customer_phone on orders(customer_phone);
create index if not exists idx_orders_created_at on orders(created_at desc);

-- RLS
alter table orders enable row level security;

-- Customers can insert orders (placing an order)
create policy "Public insert orders" on orders for insert with check (true);

-- Public can read their own orders by phone (for status checking)
create policy "Public read own orders" on orders for select using (true);

-- Admin full access
create policy "Admin full orders" on orders for all using (true) with check (true);

-- Auto-update updated_at timestamp
create or replace function update_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row
  execute function update_orders_updated_at();
