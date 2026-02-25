# D1 スキーマ（コードから導出）

このディレクトリは **ローカルコード（`src/handlers/chat.js`, `src/lib/ab.js`）の SQL 参照から導出した** D1 テーブル定義です。Cloudflare ダッシュボードで既に作成済みのテーブルと整合を取るための参照用です。

## テーブル一覧

| テーブル | 用途 | 参照元 |
|----------|------|--------|
| `ab_assignments` | ユーザーごとの A/B 割り当て（variant, provider, model） | `src/lib/ab.js` |
| `chat_messages` | 会話履歴（user_id, turn_index, role, content） | `src/handlers/chat.js` |
| `chat_runs` | API 呼び出しログ（レイテンシ・文字数・provider_request_id） | `src/handlers/chat.js` |

## カラム詳細

### ab_assignments
- `user_id` — ユーザーID（PRIMARY KEY）
- `variant` — `'A'` または `'B'`
- `provider` — `'deepseek'` または `'openai'`
- `model` — モデル名（環境変数で上書き可）

### chat_messages
- `user_id` — ユーザーID
- `turn_index` — 発話番号（user + assistant で +2 ずつ増加）
- `role` — `'user'` または `'assistant'`
- `content` — メッセージ本文

### chat_runs
- `id` — 自増（ログ用）
- `user_id`, `variant`, `provider`, `model` — 呼び出し時の割り当て
- `input_chars`, `output_chars` — 入出力文字数
- `latency_ms` — 応答時間（ミリ秒）
- `provider_request_id` — API 側のリクエストID（NULL 可）

## ローカル D1 に適用する場合

`wrangler.jsonc` に D1 バインディングを追加した上で:

```bash
# ローカル DB にスキーマ適用
npx wrangler d1 execute <DB_NAME> --local --file=./schema/001_initial.sql
```

本番に新規作成する場合（既存データがない場合のみ）:

```bash
npx wrangler d1 execute <DB_NAME> --remote --file=./schema/001_initial.sql
```

**注意:** 既存の本番 D1 に `001_initial.sql` をそのまま流すと、既にテーブルがある場合は `CREATE TABLE IF NOT EXISTS` によりスキーマのみが揃い、データは残ります。新規カラムを追加する場合は別マイグレーションファイルを用意してください。
