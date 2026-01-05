-- Migration to add missing columns to app_users table
-- Run this in your Supabase SQL Editor

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS workload_hours numeric default 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS workload_config jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS active boolean default true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar text;

-- Add comment
COMMENT ON TABLE app_users IS 'Table updated with email, workload and active status fields';
