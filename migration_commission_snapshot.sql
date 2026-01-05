-- Add commission_percent column to quotes table to snapshot the rate at time of sale
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT NULL;

-- Optional: Backfill existing quotes with current default (e.g., 3.00) if needed, 
-- but safer to leave null or update manually to avoid rewriting history incorrectly.
-- UPDATE quotes SET commission_percent = 3.00 WHERE commission_percent IS NULL;
