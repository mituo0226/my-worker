CREATE INDEX IF NOT EXISTS idx_chat_messages_user_turn
ON chat_messages(user_id, turn_index);

CREATE INDEX IF NOT EXISTS idx_chat_runs_user
ON chat_runs(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_summaries_user_bucket
ON chat_summaries(user_id, bucket);
