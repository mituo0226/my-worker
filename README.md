# exhchat worker

外部サイトのフリーページに埋め込むチャット用の Cloudflare Worker。

## 初めて確認する方へ

- **プロジェクト概要・ルール**: [`PROJECT.md`](./PROJECT.md)
- **D1 データベース**: データベース名 `ai_chat_db`、バインディング `env.DB`。詳細は PROJECT.md の「D1 データベース」節
- **外部埋め込み用コード**: [docs/embed/EXTERNAL_EMBED.md](./docs/embed/EXTERNAL_EMBED.md)
- **スキーマ（D1）**: [`schema/README.md`](./schema/README.md)

## デプロイ

- **GitHub**: デプロイ名 `my-worker`。GitHub から Cloudflare へ自動デプロイ済み
- **Cloudflare Worker**: 名前 `worker` → `https://worker.mituo0226.workers.dev/api/chat`
- **手動デプロイ**: `npx wrangler deploy`
