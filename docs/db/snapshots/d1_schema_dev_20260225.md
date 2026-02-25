# D1 スキーマスナップショット

- **Captured at**: 2026-02-25
- **Environment**: dev
- **Source**: Cloudflare Dashboard > D1 > Console

## sqlite_master 結果（CREATE 文）

### _cf_KV

```sql
CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID;
```

### ab_assignments

```sql
CREATE TABLE ab_assignments (
  user_id TEXT PRIMARY KEY,
  variant TEXT NOT NULL CHECK (variant IN ('A','B')),
  provider TEXT NOT NULL CHECK (provider IN ('deepseek','openai')),
  model TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

### chat_messages

```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

### chat_runs

```sql
CREATE TABLE chat_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_chars INTEGER NOT NULL,
  output_chars INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  provider_request_id TEXT
);
```

### chat_summaries

```sql
CREATE TABLE chat_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('6_10','11_15','16_20','21_50_profile')),
  from_turn INTEGER NOT NULL,
  to_turn INTEGER NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, bucket)
);
```

### users

```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  favorite_movie TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT
);
```
