# D1 データベース（ai_chat_db）

## D1 の役割

| 用途 | テーブル | 説明 |
|------|----------|------|
| **chat** | `chat_messages` | 会話履歴（user_id, turn_index, role, content） |
| **ab** | `ab_assignments` | ユーザーごとの A/B 割り当て（variant, provider, model） |
| **runs** | `chat_runs` | API 呼び出しログ（レイテンシ・文字数・provider_request_id） |
| **summaries** | `chat_summaries` | 会話サマリー（バケット単位の要約） |
| **users** | `users` | ユーザー情報（nickname, favorite_movie, memo） |
| **通知メール** | `user_passwords` | ユーザーごとのパスワード（通知メールに表示する用） |

※ `_cf_KV` は Cloudflare 内部用。通常は触らない。

## テーブル一覧

| テーブル | 用途 |
|----------|------|
| `_cf_KV` | Cloudflare 内部 KV（触らない） |
| `ab_assignments` | A/B 割り当て |
| `chat_messages` | 会話履歴 |
| `chat_runs` | 呼び出しログ |
| `chat_summaries` | 会話サマリー |
| `users` | ユーザー情報 |
| `user_passwords` | 通知メール用パスワード（user_id, password, updated_at） |

## 運用ルール

- **スキーマ変更は migrations で行う**。直接本番を触らない
- マイグレーションは `database/migrations/` に番号付きで追加
- Dev / Prod に同じ手順で適用する（`wrangler d1 execute`）
- スナップショットは `docs/db/snapshots/` に保存し、履歴を残す

## スナップショットの作り方

Cloudflare Dashboard > D1 > ai_chat_db > Console で以下を実行:

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;
```

結果を `docs/db/snapshots/d1_schema_dev_YYYYMMDD.md` に Markdown で整形して保存する。
