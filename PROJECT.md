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

- **Worker**: デプロイ済み  
  `https://worker.mituo0226.workers.dev/api/chat`
- **コード構成（責務分離済み）**
  - `src/index.js` — ルーティング（薄い層）
  - `src/handlers/chat.js` — チャット本体
  - `src/lib/*` — AB割当、CORS/Response、AI呼び出し、messages構築
  - `src/personas/junya.js` — 人格プロンプト
- **wrangler.jsonc**: `main` = `src/index.js`
- **D1**: `ai_chat_db`
  - uuid: `697e6ee8-22d8-42b4-982d-94f51660baac`
  - binding: `DB`
- **ローカル**: `wrangler dev` は起動するが、D1 にテーブルが無いと「no such table: ab_assignments」が出る
- **必要なテーブル**: `ab_assignments` / `chat_messages` / `chat_runs`

---

## 運用方針（確定後に追記）

- 編集 → dev 確認 → deploy、トラブル時の戻し方 など
