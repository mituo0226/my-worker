# プロジェクト概要とルール（ガードレール）

AI（Cursor）はこのファイルと AGENTS.md のガードレールを**必ず守る**こと。

---

## ガードレール（絶対ルール）

- **勝手にコミットしない / 勝手にデプロイしない**（手動で担当者がやる）
- **変更は最小にする**。必要なファイル以外を触らない
- **設定ファイル（wrangler.jsonc 等）の全文差し替えは禁止**。必要な場合は理由と差分を先に提示
- **何かを削除する前に必ず確認**（削除禁止に近い）
- **まず「現状診断 → 提案 → 担当者OK → 実装」の順で進める**

---

## プロジェクト概要

- **目的**: 外部サイトのフリースペースに埋め込みHTMLを置き、Cloudflare Worker（`/api/chat`）と通信してチャットを動かす
- **キャラクター**: 現在 1 名のみ（佐藤淳也）。他キャラは今は不要。今後複数キャラ追加の可能性あり → 土台構造は分離済み

---

## 現在の実装状況

- **GitHub**: リポジトリを保存。デプロイ名は **my-worker**。GitHub から Cloudflare へ自動デプロイ済み
- **Cloudflare Worker**: 名前は **worker**。デプロイ済み  
  `https://worker.mituo0226.workers.dev/api/chat`
- **コード構成（責務分離済み）**
  - `src/index.js` — ルーティング（薄い層）
  - `src/handlers/chat.js` — チャット本体
  - `src/lib/*` — AB割当、CORS/Response、AI呼び出し、messages構築
  - `src/personas/junya.js` — 人格プロンプト
- **wrangler.jsonc**: `main` = `src/index.js`

---

## D1 データベース

Cloudflare Worker に **D1 がバインド済み**。コード内では `env.DB` でアクセスする。

| 項目 | 値 |
|------|-----|
| **データベース名** | `ai_chat_db` |
| **database_id（UUID）** | `697e6ee8-22d8-42b4-982d-94f51660baac` |
| **バインディング** | `DB`（`env.DB`） |
| **設定箇所** | `wrangler.jsonc` の `d1_databases` |

**必要なテーブル**: `ab_assignments` / `chat_messages` / `chat_runs`  
スキーマ定義は `schema/001_initial.sql`、説明は `schema/README.md` を参照。

**ローカル**: `wrangler dev` 使用時は、事前に `npx wrangler d1 execute ai_chat_db --local --file=./schema/001_initial.sql` でテーブル作成が必要（未作成だと「no such table: ab_assignments」が出る）。

---

## 外部サイトへの埋め込み

- フロントコードは **body 以下から** 貼り付ける形式（完全な HTML の形ではなく可）
- 外部サイトのフリーページに貼り付けてチャットを表示する
- 詳細・貼り付け用コードは **`docs/embed/EXTERNAL_EMBED.md`** を参照

---

## 運用方針

- **編集 → dev 確認 → deploy**。テストは本番 URL から行う
- **フロントコード**: バックアップ用に常に同期しておく
- **デプロイ**: GitHub の自動デプロイ、またはローカルから `npx wrangler deploy`
