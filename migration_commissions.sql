-- Migration: Add Commission and Payment fields to Quotes table
alter table quotes add column if not exists discount numeric default 0;
alter table quotes add column if not exists payment_method text;
alter table quotes add column if not exists down_payment_method text;
alter table quotes add column if not exists user_id text references app_users(id);
alter table quotes add column if not exists commission_paid boolean default false;
alter table quotes add column if not exists commission_date text;
