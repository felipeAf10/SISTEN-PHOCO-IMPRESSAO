-- Add composite product support columns
alter table products 
add column if not exists is_composite boolean default false,
add column if not exists composition jsonb default '[]'::jsonb;
