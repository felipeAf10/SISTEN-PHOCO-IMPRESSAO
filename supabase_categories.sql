-- Create a table for fixed product categories
create table if not exists public.product_categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default categories (optional, based on what we saw in code)
insert into public.product_categories (name) values
('Adesivos'),
('Banners'),
('Brindes'),
('Chapas'),
('Letra Caixa'),
('Lonas'),
('Envelopamento'),
('LED'),
('Impressão'),
('Serviços'),
('Têxtil'),
('Corte Laser'),
('Gravação'),
('Fachadas'),
('Sinalização')
on conflict (name) do nothing;

-- Set up RLS (Row Level Security) - allow all for now as per internal app style
alter table public.product_categories enable row level security;
create policy "Enable all access for authenticated users" on public.product_categories for all using (true) with check (true);
