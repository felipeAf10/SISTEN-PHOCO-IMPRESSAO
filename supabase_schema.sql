-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products Table
create table if not exists products (
  id text primary key,
  name text not null,
  category text not null,
  unit_type text not null,
  cost_price numeric default 0,
  production_time_minutes numeric default 0,
  waste_percent numeric default 0,
  sale_price numeric default 0,
  stock numeric default 0, 
  available_roll_widths jsonb
);

-- Customers Table
create table if not exists customers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  address text,
  document text
);

-- Quotes Table
create table if not exists quotes (
  id text primary key,
  date text,
  customer_id text references customers(id),
  items jsonb, -- Storing items as JSON for flexibility
  total_amount numeric default 0,
  down_payment numeric default 0,
  design_fee numeric default 0,
  install_fee numeric default 0,
  status text default 'draft',
  deadline_days numeric default 0,
  deadline_days numeric default 0,
  notes text,
  discount numeric default 0,
  payment_method text,
  down_payment_method text,
  user_id text references app_users(id),
  commission_paid boolean default false,
  commission_date text
);

-- Financial Config (Singleton)
create table if not exists financial_config (
  id text primary key default 'default',
  productive_hours_per_month numeric default 0,
  tax_percent numeric default 0,
  commission_percent numeric default 0,
  target_profit_margin numeric default 0
);

-- Fixed Assets
create table if not exists fixed_assets (
  id text primary key,
  name text not null,
  value numeric default 0,
  useful_life_years numeric default 0,
  monthly_depreciation numeric default 0
);

-- Fixed Costs
create table if not exists fixed_costs (
  id text primary key,
  description text not null,
  value numeric default 0
);

-- Schedule Events
create table if not exists schedule_events (
  id text primary key,
  type text not null,
  title text not null,
  date text,
  duration_minutes numeric default 0,
  customer_id text references customers(id),
  description text,
  responsible text,
  status text default 'pending'
);

-- App Users
create table if not exists app_users (
  id text primary key,
  username text unique not null,
  password text not null, -- Storing plainly as per current simple requirement
  role text not null,
  name text not null
);

-- Row Level Security (Simple Policy: Public for now based on anon key usage request)
alter table products enable row level security;
alter table customers enable row level security;
alter table quotes enable row level security;
alter table financial_config enable row level security;
alter table fixed_assets enable row level security;
alter table fixed_costs enable row level security;
alter table schedule_events enable row level security;
alter table app_users enable row level security;

-- Create policies to allow all access for anon key (since user provided anon key and wants it 100% functional quickly)
create policy "Enable access for all users" on products for all using (true) with check (true);
create policy "Enable access for all users" on customers for all using (true) with check (true);
create policy "Enable access for all users" on quotes for all using (true) with check (true);
create policy "Enable access for all users" on financial_config for all using (true) with check (true);
create policy "Enable access for all users" on fixed_assets for all using (true) with check (true);
create policy "Enable access for all users" on fixed_costs for all using (true) with check (true);
create policy "Enable access for all users" on schedule_events for all using (true) with check (true);
create policy "Enable access for all users" on app_users for all using (true) with check (true);

-- Insert Default Financial Config
insert into financial_config (id, productive_hours_per_month, tax_percent, commission_percent, target_profit_margin)
values ('default', 160, 6, 3, 20)
on conflict (id) do nothing;
