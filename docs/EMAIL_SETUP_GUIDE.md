# メール通知 設定ガイド

Resend で独自ドメインを検証し、任意のユーザーにメール通知を送るための設定手順。

---

## 前提

- Resend アカウント作成済み
- `RESEND_API_KEY` 登録済み
- ドメイン（例: `syugo-sin.com`）の DNS を Cloudflare で管理している

---

## Step 1: Resend でドメインを追加

1. [resend.com/domains](https://resend.com/domains) を開く
2. **Add Domain** をクリック
3. ドメインを入力（例: `syugo-sin.com`）
4. **Add** をクリック
5. Resend が表示する **DNS レコード一覧** を確認（次の Step で追加）

---

## Step 2: Cloudflare DNS にレコードを追加

Resend の画面に表示されるレコードを、Cloudflare にそのまま追加する。

### 例（Resend の案内に従う）

| タイプ | 名前 | 値 | 備考 |
|--------|------|-----|------|
| MX | `send` | Resend が表示する値（例: `feedback-smtp.ap-northeast-1.amazonses.com`） | Priority は Resend の表示通り |
| TXT | `resend._domainkey.send` | Resend が表示する DKIM 用の長い文字列 | コピー＆ペースト |

### Cloudflare での操作

1. [dash.cloudflare.com](https://dash.cloudflare.com) → ドメインを選択 → **DNS** → **レコード**
2. **レコードを追加** をクリック
3. タイプ・名前・値を Resend の案内どおりに入力
4. **保存**

---

## Step 3: 検証完了を待つ

- DNS 反映には数分〜最大 48 時間
- Resend の Domains 画面で **Verified** になるまで待つ
- 緑のチェックが付いたら完了

---

## Step 4: RESEND_FROM_EMAIL を設定

検証が完了したら、PowerShell で実行:

```powershell
npx wrangler secret put RESEND_FROM_EMAIL
```

プロンプトが表示されたら、次の形式で入力（ドメイン・アドレスは環境に合わせて変更）:

```
"チャットサポートセンター" <chat@syugo-sin.com>
```

**形式の説明:**
- `"チャットサポートセンター"` … 送信者表示名（メールの「差出人」に表示される。番組全体の窓口名）
- `<chat@syugo-sin.com>` … 送信元メールアドレス（Resend で検証したドメインのアドレス）

---

## Step 5: 動作確認

```powershell
Invoke-RestMethod -Uri "https://worker.mituo0226.workers.dev/api/email/test" -Method POST -ContentType "application/json" -Body '{"to":"任意のメールアドレス@gmail.com"}'
```

`ok: true` になり、指定したアドレスにメールが届けば設定完了。

---

## 複数キャラクターの設定

同じドメインで、キャラごとに異なる送信元を使う場合。

### パターンA: 1つの Worker で切り替える（将来対応）

- 現状の実装では 1 Worker あたり 1 セットの `RESEND_FROM_EMAIL` と `CHAT_CHARACTER_NAME`
- 複数キャラを同じ Worker で扱う場合は、ロジックの拡張が必要

### パターンB: Worker を分ける（推奨）

- キャラごとに別 Worker（別プロジェクト）をデプロイ
- 各 Worker で別の `RESEND_FROM_EMAIL` と `CHAT_CHARACTER_NAME` を設定

**例: 佐藤淳也用**
```
RESEND_FROM_EMAIL = "チャットサポートセンター" <junya@send.syugo-sin.com>
EMAIL_SENDER_NAME = チャットサポートセンター
CHAT_CHARACTER_NAME = 佐藤淳也
```

**例: 山田花子用（別 Worker）**
```
RESEND_FROM_EMAIL = "チャットサポートセンター" <hanako@send.syugo-sin.com>
EMAIL_SENDER_NAME = チャットサポートセンター
CHAT_CHARACTER_NAME = 山田花子
```

---

## 環境変数まとめ

| 変数 | 設定方法 | 例 |
|------|----------|-----|
| `RESEND_API_KEY` | `npx wrangler secret put RESEND_API_KEY` | （Resend の API キー） |
| `RESEND_FROM_EMAIL` | `npx wrangler secret put RESEND_FROM_EMAIL` | `"チャットサポートセンター" <chat@syugo-sin.com>` |
| `EMAIL_SENDER_NAME` | `wrangler.jsonc` の vars | `チャットサポートセンター`（件名・本文に使用。番組窓口名） |
| `CHAT_CHARACTER_NAME` | `wrangler.jsonc` の vars | `佐藤淳也`（チャット応答のキャラ名。メール送信者名とは別） |

---

## トラブルシューティング

| 現象 | 確認事項 |
|------|----------|
| メールが届かない | Resend の Domains で Verified か、`RESEND_FROM_EMAIL` のドメインが一致しているか |
| 特定アドレスのみ届かない | 迷惑メールフォルダ、ブロック設定を確認 |
| `RESEND_API_KEY not configured` | Cloudflare ダッシュボードの Variables and Secrets を確認 |
