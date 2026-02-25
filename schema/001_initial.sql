-- D1 テーブル定義（ローカルコードから導出）
-- 実行: wrangler d1 execute <DB_NAME> --local --file=./schema/001_initial.sql
-- 本番: wrangler d1 execute <DB_NAME> --remote --file=./schema/001_initial.sql

-- A/B 割り当て（1ユーザー1行、初回アクセス時に決定）
CREATE TABLE IF NOT EXISTS ab_assignments (
  user_id     TEXT NOT NULL PRIMARY KEY,
  variant     TEXT NOT NULL,   -- 'A' | 'B'
  provider    TEXT NOT NULL,   -- 'deepseek' | 'openai'
  model       TEXT NOT NULL    -- 例: deepseek-chat, gpt-4o-mini
);

-- チャット履歴（ユーザーごとに turn_index で時系列）
CREATE TABLE IF NOT EXISTS chat_messages (
  user_id     TEXT NOT NULL,
  turn_index  INTEGER NOT NULL,
  role        TEXT NOT NULL,   -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  PRIMARY KEY (user_id, turn_index)
);

-- 呼び出しログ（レイテンシ・文字数・プロバイダー情報）
CREATE TABLE IF NOT EXISTS chat_runs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               TEXT NOT NULL,
  variant               TEXT NOT NULL,
  provider              TEXT NOT NULL,
  model                 TEXT NOT NULL,
  input_chars           INTEGER NOT NULL,
  output_chars          INTEGER NOT NULL,
  latency_ms            INTEGER NOT NULL,
  provider_request_id   TEXT
);

-- 検索用インデックス（コードで ORDER BY turn_index / WHERE user_id を使用）
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_turn
  ON chat_messages (user_id, turn_index DESC);

CREATE INDEX IF NOT EXISTS idx_chat_runs_user
  ON chat_runs (user_id);
