# 現状診断（2026-02-23）

## 1. src/ 以下の構成

### ファイル・import パス

| ファイル | 役割 | import | export | 判定 |
|----------|------|--------|--------|------|
| `src/index.js` | ルーティング | `./lib/respond.js`, `./handlers/chat.js` | `default { fetch }` | OK |
| `src/handlers/chat.js` | チャット本体 | `../lib/respond.js`, `../lib/ab.js`, `../lib/providers.js`, `../lib/messages.js` | `handleChat` | OK |
| `src/lib/respond.js` | CORS・Response | なし | `getCorsHeaders`, `json`, `preflight`, `withCors`, `checkOrigin` | OK |
| `src/lib/ab.js` | A/B 割当 | なし | `getAB` | OK |
| `src/lib/providers.js` | AI 呼び出し | なし | `callProvider` | OK |
| `src/lib/messages.js` | メッセージ構築 | `../personas/junya.js` | `buildMessages` | OK |
| `src/personas/junya.js` | 人格プロンプト | なし | `getSystemPrompt` | OK |

- 相対パスはすべて `.js` 付きで ESM として正しい。
- `wrangler` は `main: src/index.js` からバンドルするため、上記だけで依存は閉じている。

### 例外処理の確認

- **index.js**: `withCors(fn, env)` 内で `fn()` の例外を catch し 500 で返している。
- **chat.js**:  
  - `req.json()` 失敗 → 400 Invalid JSON  
  - `userId` / `message` 欠損 → 400  
  - `message` 長さ超過 → 413  
  - `callProvider` 失敗 → 502（detail にメッセージ）
- **providers.js**: DeepSeek/OpenAI の `!r.ok` や非 JSON を `throw new Error(...)` し、chat.js で 502 に変換。

**結論**: 構成・import/export・例外処理に問題なし。変更不要。

---

## 2. D1 テーブル定義（必要テーブル・カラム）

コードが参照しているのは次の 3 テーブルのみ。既存の `schema/001_initial.sql` と一致している。

| テーブル | カラム | 備考 |
|----------|--------|------|
| **ab_assignments** | `user_id` (TEXT, PK), `variant`, `provider`, `model` (いずれも TEXT) | 1 ユーザー 1 行 |
| **chat_messages** | `user_id`, `turn_index`, `role`, `content` (PK: user_id, turn_index) | 履歴 |
| **chat_runs** | `user_id`, `variant`, `provider`, `model`, `input_chars`, `output_chars`, `latency_ms`, `provider_request_id` | ログ。コードでは `id` を参照していないので、自増 `id` はあってもなくても可 |

適用する定義は **`schema/001_initial.sql` をそのまま使ってよい**。

---

## 3. wrangler d1 execute コマンド

DB 名は `wrangler.jsonc` の `database_name`: **ai_chat_db**。

### ローカル（.wrangler/state 内の SQLite に適用）

```powershell
cd c:\Users\mituo\work\exchat\worker
npx wrangler d1 execute ai_chat_db --local --file=./schema/001_initial.sql
```

### 本番（Cloudflare 上の D1 に適用）

```powershell
cd c:\Users\mituo\work\exchat\worker
npx wrangler d1 execute ai_chat_db --remote --file=./schema/001_initial.sql
```

- 本番は「ローカルで POST が成功することを確認したあと」に実行することを推奨。
- `001_initial.sql` は `CREATE TABLE IF NOT EXISTS` のため、既にテーブルがあってもエラーにはならない。

---

## 4. POST テスト手順（PowerShell）

### 1) ローカルで dev 起動

```powershell
cd c:\Users\mituo\work\exchat\worker
npx wrangler dev
```

`Ready on http://127.0.0.1:8787` を確認。

### 2) ローカルへ POST（Invoke-RestMethod）

```powershell
$body = @{ userId = "u-test"; message = "こんにちは" } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://127.0.0.1:8787/api/chat" -Method POST -Body $body -ContentType "application/json; charset=utf-8"
```

成功時は `ok: true` と `reply` などが返る。失敗時は `Invoke-WebRequest` で詳細を見る：

```powershell
$body = @{ userId = "u-test"; message = "こんにちは" } | ConvertTo-Json -Compress
Invoke-WebRequest -Uri "http://127.0.0.1:8787/api/chat" -Method POST -Body $body -ContentType "application/json; charset=utf-8" -UseBasicParsing | Select-Object StatusCode, Content
```

### 3) 本番へ POST（確認用）

```powershell
$body = @{ userId = "u-prod-test"; message = "テスト" } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "https://worker.mituo0226.workers.dev/api/chat" -Method POST -Body $body -ContentType "application/json; charset=utf-8"
```

---

## 5. 推奨アクション（優先順）

1. **D1 ローカルにテーブル作成**  
   `npx wrangler d1 execute ai_chat_db --local --file=./schema/001_initial.sql` を実行。
2. **ローカルで POST 成功確認**  
   `wrangler dev` 起動 → 上記 PowerShell で POST → `ok: true` と `reply` を確認。
3. **本番 D1 に同じスキーマを適用**  
   問題なければ `--remote` で同じ SQL を実行。
4. フロント埋め込み HTML は次のメッセージで受け取り、必要範囲を指示する。

---

## フロント HTML で必要な範囲（次のメッセージ用）

貼り付けは「必要な範囲」だけでよい。以下を教えてほしい：

1. **Worker の URL を指定している箇所**  
   例: `fetch("https://worker.mituo0226.workers.dev/api/chat", ...)` や `const API = "..."` など、本番 Worker 向けの URL が 1 か所でも分かればよい。
2. **リクエストボディの組み立て箇所**  
   `userId` / `message`（および任意で `nickname`）を JSON で送っている部分。該当する数行。
3. **レスポンスの利用箇所**  
   `ok` や `reply` をどこで使っているか（表示・エラー表示など）の数行。

可能なら「該当部分だけ」をコピーして貼ってください。全体を貼らなくてよい。
