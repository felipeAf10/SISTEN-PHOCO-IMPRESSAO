-- Add last_followup_at column to quotes table
ALTER TABLE quotes ADD COLUMN last_followup_at TIMESTAMP WITH TIME ZONE;

-- Comment on column
COMMENT ON COLUMN quotes.last_followup_at IS 'Timestamp of the last sales follow-up interaction (e.g. WhatsApp message sent)';
