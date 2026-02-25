# D1 運用コマンド

※ Cursor は手を出さない。ユーザーが手動で実行するドキュメント。

## Dev D1 に適用

```bash
wrangler d1 execute ai_chat_db --local --file database/migrations/0001_initial.sql
```

## Prod D1 に適用

```bash
wrangler d1 execute ai_chat_db --remote --file database/migrations/0001_initial.sql
```

## スキーマ取得（スナップショット作成用）

Cloudflare Dashboard > D1 > ai_chat_db > Console で実行:

```sql
SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;
```
