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

- **件名**: `【{送信者名}】あなたにメッセージが届きました`
- **本文**（ID・パスワード・チャットURL は利用可能な場合のみ表示）:
  ```
  【{キャラクター名}】様からメッセージが届きました。
  チャットを開いてご確認ください。
  あなたのID：{userId}
  あなたのパスワード：{password}   ※パスワードが渡っている場合のみ
  チャットURL：{url}
  ```

キャラクター名は `CHAT_CHARACTER_NAME` で変更可能。複数キャラクター対応時は、各 Worker やデプロイごとに別の値を設定する。

---

## 通知メールに ID・パスワードを表示する

通知メールに「あなたのID」に加えて「あなたのパスワード」も表示するには、チャット送信時にパスワードが API に渡っている必要があります。次のいずれかでパスワードを渡してください。

1. **埋め込み時の置換**: 外部サイトで embed を配信する際、`[[UPASS]]` をユーザーのパスワードに置換する。  
   → そのページから送信されたメッセージに対する通知メールにパスワードが含まれる。
2. **URL パラメータ**: チャットページのURLに `upass=パスワード` を付与する（例: `https://.../embed.html?userId=08012345678&upass=xxx`）。  
   → そのURLで開いた画面から送信したメッセージに対する通知メールにパスワードが含まれる。

どちらも行わない場合は、通知メールには「あなたのID」と「チャットURL」のみ表示され、パスワードは表示されません。

### パスワードがまだ表示されないとき

1. **Worker をデプロイしたか**  
   パスワード保存・メール表示の処理は Worker 側のコードです。未デプロイなら `npx wrangler deploy` を実行してください。
2. **embed でパスワードが渡っているか**  
   外部サイトで `[[UPASS]]` を置換しているか、チャットURLに `?upass=パスワード` が付いているか確認してください。渡っていないと保存されません。
3. **既存ユーザー（すでに1回以上メッセージを送った人）**  
   これまでパスワード付きで送っていないユーザーは、DB にパスワードがありません。**D1 で手動登録**すると、そのあとの通知メールからパスワードが表示されます。

#### 既存ユーザーのパスワードを D1 で手動登録する

Cloudflare ダッシュボード → D1 → ai_chat_db → コンソール で、次の SQL を実行してください。  
`08054107726` と `0226` の部分を、対象のユーザーID・パスワードに置き換えてください。

```sql
INSERT INTO user_passwords (user_id, password, updated_at) VALUES ('08054107726', '0226', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
ON CONFLICT(user_id) DO UPDATE SET password=excluded.password, updated_at=excluded.updated_at;
```

登録後、そのユーザーが次にメッセージを送ったときの通知メールから「あなたのパスワード」が表示されます。

---

## 動作条件

- `[[UADDRESS]]` が置換され、有効なメールアドレスが API に渡っていること
- `RESEND_API_KEY` が設定されていること
- 上記を満たすとき、チャット返信のたびに通知メールを送信
