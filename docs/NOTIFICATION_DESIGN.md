# 連絡時にユーザーへ通知する方法の検討

## 現状の前提

- **チャット構成**: 1ユーザー ↔ AI（佐藤淳也）の1対1
- **フロー**: ユーザーが送信 → API が同期的に AI 返信を返す
- **「連絡」の解釈**:
  1. **AI返信時**: ユーザーが送ったメッセージへの AI の返信が届いたとき
  2. **将来**: 管理者・スタッフがユーザーにメッセージを送る場合（要アーキテクチャ拡張）

---

## 通知方式の比較

| 方式 | タブ閉じていても通知 | 実装難易度 | 追加要件 | 備考 |
|------|----------------------|------------|----------|------|
| **A. クライアント通知（Notification API）** | ❌ | 低 | なし | タブが開いているときのみ |
| **B. Web Push** | ✅ | 中 | VAPID鍵、購読保存 | タブ閉じていても可 |
| **C. メール** | ✅ | 中 | メールアドレス、送信サービス | 外部サービス連携 |
| **D. LINE Notify** | ✅ | 高 | LINE連携、OAuth | 日本では馴染み深い |

---

## A. クライアント側 Notification API（簡単）

### 概要
- 返信を受信したとき、タブがバックグラウンドなら `new Notification()` で通知
- サーバー変更なし、embed 側の JS だけで実装可能

### 実装
```javascript
// 返信を受け取った後、タブが非表示なら通知
if (document.hidden && Notification.permission === "granted") {
  new Notification("佐藤淳也", { body: data.reply.slice(0, 50) + "…", icon: "/icon-192.svg" });
}
```

### 制約
- ページを開いたまま（タブ切り替え可）でないと動かない
- タブを閉じると通知不可
- 初回は `Notification.requestPermission()` の許可が必要

### 所要工数
- **小**: embed.html に数十行追加で完了

---

## B. Web Push（タブ閉じていても可）

### 概要
- Service Worker の `push` イベントで通知
- サーバーが Push メッセージを送信する必要がある
- [PushForge](https://pushforge.draphy.org/) など、Cloudflare Workers 対応ライブラリあり

### 必要なもの
1. **VAPID 鍵** … `npx @pushforge/builder vapid` で生成
2. **購読の保存** … `userId` に紐づけて `PushSubscription` の JSON を D1 に保存
3. **送信タイミング** … チャット返信を保存した直後に Push 送信

### フロー
```
[クライアント]
1. Service Worker 登録
2. Notification.requestPermission()
3. registration.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })
4. subscription.toJSON() を POST /api/push/subscribe で送信

[サーバー]
5. D1 の push_subscriptions(user_id, subscription_json) に保存
6. handleChat の返信保存後、該当 user_id の購読へ PushForge で送信
```

### 新規テーブル例
```sql
CREATE TABLE push_subscriptions (
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  subscription_json TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, endpoint)
);
```

### 制約
- 同一ユーザーが複数デバイスを持つ場合は複数行
- `endpoint` が変わる（ブラウザ再インストール等）と無効化される
- Safari 16+、Chrome、Firefox、Edge 対応

### 所要工数
- **中**: 新エンドポイント、D1 テーブル、chat ハンドラ修正、embed + SW 修正

---

## C. メール通知

### 概要
- 新着メッセージがあったときにメール送信
- Resend / SendGrid / MailChannels（CF連携）など

### 必要なもの
1. ユーザーのメールアドレス収集（設定画面・フォーム）
2. メール送信 API 連携
3. 送信トリガー（chat 返信後 or 定時バッチ）

### 制約
- メールアドレスが必須
- スパム対策・配信制限に注意
- 即時性は Web Push より劣る場合あり

### 所要工数
- **中〜大**: メール入力 UI、送信ロジック、外部サービス設定

---

## D. LINE Notify / LINE Messaging API

### 概要
- ユーザーが LINE 連携すると、新着を LINE で通知
- LINE Login / LINE Notify の OAuth が必要

### 必要なもの
1. LINE Developers アカウント
2. OAuth フロー（連携解除も考慮）
3. access_token の保存（暗号化推奨）
4. メッセージ送信 API 呼び出し

### 制約
- 実装・運用コストが高い
- ユーザーが LINE 連携する必要がある

### 所要工数
- **大**: OAuth、トークン管理、LINE API 連携

---

## 推奨アプローチ

### フェーズ1: クライアント通知（すぐ実装可能）
- **A. Notification API** を embed に追加
- タブがバックグラウンドのときだけ、AI 返信受け取り後に通知
- サーバー変更なし、工数も小さい
- 許可ダイアログを「通知をオンにする」などの案内で促す

### フェーズ2: Web Push（必要に応じて）
- タブを閉じていても通知したい場合は **B. Web Push** を導入
- PushForge + D1 で購読管理
- 既存の manifest / sw.js を拡張して push イベントをハンドル

### フェーズ3: 管理者→ユーザーへの通知（将来）
- 管理者がユーザーにメッセージを送る機能を追加した場合
- そのトリガーで Web Push またはメールを送信

---

## 参考リンク

- [PushForge](https://pushforge.draphy.org/) … Cloudflare Workers 向け Web Push ライブラリ
- [Web Push API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Push_API)
- [Notification API - MDN](https://developer.mozilla.org/ja/docs/Web/API/Notifications_API)
