-- Migration: 0003_user_passwords
-- 通知メールにパスワードを表示するため、クライアントから受け取ったパスワードを保存する。
-- チャット送信時に password が渡された場合にのみ保存し、通知メール送信時に参照する。

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
