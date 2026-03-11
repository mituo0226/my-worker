-- Migration: 0004_email_notification_throttle
-- 同一メールアドレスへの通知を3時間に1回までに制限する。
-- chat.js で送信前に last_sent_at を参照し、3時間経過していれば送信してから本テーブルを更新する。

CREATE TABLE IF NOT EXISTS email_notification_throttle (
  email TEXT PRIMARY KEY,
  last_sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
