-- Migration: 0004_email_notification_throttle
-- 同一メールアドレスへの通知を3時間に1回までに制限する。

CREATE TABLE IF NOT EXISTS email_notification_throttle (
  email TEXT PRIMARY KEY,
  last_sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
