# メール通知のセットアップ

チャット返信時に、ユーザーへメール通知を送る機能の設定方法。

---

## 環境変数

| 変数 | 種類 | 必須 | 説明 |
|------|------|:----:|------|
| `RESEND_API_KEY` | secret | ○ | Resend API キー |
| `RESEND_FROM_EMAIL` | secret | △ | 送信元メールアドレス（未設定時は `onboarding@resend.dev`） |
| `CHAT_CHARACTER_NAME` | var | - | キャラクター名（メール本文・件名に使用。未設定時は「佐藤淳也」） |

### セットアップ手順

1. [Resend](https://resend.com) でアカウント作成
2. API キーを取得（Dashboard → API Keys）
3. 以下を実行:

```bash
# 必須: Resend API キー
npx wrangler secret put RESEND_API_KEY

# 本番用: 独自ドメインの送信元（Resend でドメイン検証後）
npx wrangler secret put RESEND_FROM_EMAIL
# 例: "佐藤淳也" <chat@yourdomain.com>
```

4. キャラクター名を変更する場合:
   - `wrangler.jsonc` の `vars.CHAT_CHARACTER_NAME` を編集
   - または `npx wrangler secret put CHAT_CHARACTER_NAME` で上書き

---

## メール文面（テンプレート）

- **件名**: `【{キャラクター名}】からメッセージが届きました`
- **本文**:
  ```
  {キャラクター名}からメッセージが届きました。
  チャットを開いてご確認ください。
  ```

キャラクター名は `CHAT_CHARACTER_NAME` で変更可能。複数キャラクター対応時は、各 Worker やデプロイごとに別の値を設定する。

---

## 動作条件

- `[[UADDRESS]]` が置換され、有効なメールアドレスが API に渡っていること
- `RESEND_API_KEY` が設定されていること
- 上記を満たすとき、チャット返信のたびに通知メールを送信
