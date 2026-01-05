-- Add recipient_id column to chat_messages for Private Messaging
alter table public.chat_messages 
add column if not exists recipient_id uuid;

-- Optional: Add index for faster queries on recipient
create index if not exists idx_chat_recipient on public.chat_messages(recipient_id);
create index if not exists idx_chat_sender on public.chat_messages(sender_id);

-- Note: We already removed the strict FK constraint, so we can store any UUID here.
-- Ideally in future we sync app_users with auth.users to restore FKs.
