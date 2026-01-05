-- Add stock_deducted column to quotes table to prevent double deduction
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;
