# Web Push 実装可否チェックリスト

現状のプロジェクト構成で Web Push が成立する条件を満たせるか確認する。

---

## A) チェック結果一覧

| # | 項目 | 結果 | 備考 |
|---|------|------|------|
| 1 | 配信形態（同一オリジン） | **NG** | 外部サイト埋め込み時はオリジンが異なる（致命的） |
| 2 | HTTPS | OK | Worker は HTTPS。外部サイトも通常 HTTPS |
| 3 | Service Worker の設置 | **NG** | 外部サイト埋め込み時は SW を同一オリジンで配置できない |
| 4 | Manifest（PWA） | **NG** | 同上。外部サイトの文脈では私たちの manifest は使えない |
| 5 | Push API / Notifications API | 要調整 | API は利用可能だが、SW が必須のため意味をなさない |
| 6 | iPhone（iOS Safari） | **NG** | ホーム画面追加の PWA のみ対応。追加先が外部サイトだと SW は私たちが置けない |
| 7 | サーバー側の送信要件 | OK | VAPID、D1、トリガーは対応可能 |
| 8 | 制約・運用 | 要調整 | フォールバック等は設計次第 |

---

## B) 詳細と対応案

### 1) 配信形態 — **NG（致命的）**

**現状**
- チャットは **外部サイトのフリースペースに body 以下を貼り付け**（インライン埋め込み）
- iframe ではなく、親ページの document に直接 script が実行される
- ページのオリジン = 外部サイト（例: `pc24nghnx02.biz`, `new4.kanri.work`）
- Worker のオリジン = `worker.mituo0226.workers.dev`

**Web Push の要件**
- Service Worker は **同一オリジン** で登録する必要がある（仕様で保証されている）
- `scriptURL` と登録ページの origin が一致しないと `SecurityError` で拒否される

**結論**
- 外部サイトに埋め込まれている限り、ページのオリジンは外部サイト
- 私たちの `sw.js` は Worker ドメインにあり、**クロスオリジンでは登録不可**
- この制約はプロジェクト内の変更では解決できない

---

### 2) HTTPS — **OK**

- Cloudflare Workers は HTTPS で配信
- 外部サイトも本番では HTTPS が一般的

---

### 3) Service Worker の設置 — **NG**

**現状**
- `public/sw.js` あり。Worker の assets で `/sw.js` として配信可能
- embed では `isSameOrigin` のときだけ `navigator.serviceWorker.register("/sw.js")` を呼ぶ
  - `window.location.origin === (new URL(API_URL)).origin` のときのみ

**問題**
- 外部サイト埋め込み時: `window.location.origin` = 外部サイト
- `register("/sw.js")` は外部サイトの `/sw.js` を指す → 外部サイトに `/sw.js` がなければ 404
- 仮に `register("https://worker.mituo0226.workers.dev/sw.js")` としても、**クロスオリジン登録は仕様で禁止** → 登録失敗

**同一オリジンで開く場合**
- `worker.mituo0226.workers.dev/embed.html` を直接開くときは OK
- ただしメイン利用形態は外部サイト埋め込み

---

### 4) Manifest — **NG**

- 上記と同様。manifest も SW も、**ページが表示されているオリジン**で配信されている必要がある
- 外部サイトのページでは、私たちの manifest は利用できない

---

### 5) Push API / Notifications API — **要調整**

- `Notification`, `serviceWorker`, `PushManager` は HTTPS 下で利用可能
- ただし Web Push には **Service Worker の push イベント** が必須
- SW が登録できない構成では、これらの API だけでは Push は実現できない

---

### 6) iPhone（iOS Safari）— **NG**

**iOS の制約**
- iOS 16.4 以降、Web Push は **ホーム画面に追加された PWA** として起動した場合のみ有効
- 通常の Safari タブでは Web Push は動作しない

**現状の案内**
- ブックマーク案内で「ホーム画面に追加」を案内している（`public/embed.html`）
- ただし追加先は **そのページのオリジン**
  - 外部サイト埋め込み時: 外部サイトがホーム画面に追加される
  - そのサイトに SW がなければ、ホーム画面追加後も Push は使えない

**結論**
- 私たちは外部サイトに SW を置けないため、iOS でも Web Push は成立しない

---

### 7) サーバー側の送信要件 — **OK**

| 要件 | 現状 | 対応 |
|------|------|------|
| VAPID 鍵 | 未設定 | wrangler の secrets または env に追加 |
| 購読保存 | 未設定 | D1 に `push_subscriptions` テーブルを追加 |
| 送信トリガー | 未設定 | `handleChat` 内または Queue で Push 送信を呼ぶ |

これらは Worker 側の変更で対応可能。ただし **同一オリジンで SW が動く構成** が前提。

---

### 8) 制約・運用 — **要調整**

- 許可拒否時のフォールバック: メール通知等を検討
- 通知文面: 個人情報を含めず「新着があります」程度に抑える

---

## C) 代替案

### 代替案 1: **iframe 埋め込みに変更**（推奨）

**内容**
- 外部サイトには iframe 1行だけを貼り付け
- `src="https://worker.mituo0226.workers.dev/embed.html?uid=[[UID]]&uname=[[UNAME]]"`

**メリット**
- iframe 内のページは Worker のオリジンで表示される
- Worker の `/sw.js` を同一オリジンとして登録できる
- Web Push の条件を満たせる

**デメリット・注意**
- 埋め込み方法が「貼り付け」から「iframe 指定」に変わる
- 外部サイト側の修正が必要
- iframe の高さ調整（`height` や `style`）が必要な場合がある
- サードパーティ cookie 等のポリシーには要確認

**修正箇所**
- [EXTERNAL_EMBED.md](../embed/EXTERNAL_EMBED.md) … 埋め込み手順を iframe 方式に更新
- `public/embed.html` … `?uid=&uname=` のクエリパラメータ対応を追加（既存 `[[UID]]` 置換の代替）

---

### 代替案 2: **チャット専用ページ + リンク誘導**

**内容**
- `worker.mituo0226.workers.dev/chat` のような専用ページを用意
- 外部サイトのフリー領域には「チャットを開く」リンクだけを設置
- リンク先で同一オリジンとして SW を登録し、Web Push を有効化

**メリット**
- 完全に同一オリジンで動作
- 埋め込みコードを書かずに済む

**デメリット**
- チャットが別ページになり、サイト内に常時表示されない
- 遷移による UX の変化

**修正箇所**
- `public/chat.html` を新規作成（または `embed.html` を `/chat` で配信）
- `src/index.js` … `/chat` のルートを assets で配信（既存 assets 設定で対応可能）

---

### 代替案 3: **メール通知**（[[UADDRESS]] 利用）

**内容**
- 外部サイトの置換タグ `[[UADDRESS]]` でメールアドレスを取得
- 新着メッセージ時にメール送信（Resend / SendGrid / MailChannels 等）

**メリット**
- SW 不要。埋め込み形態を変えずに使える
- タブを閉じていても届く

**デメリット**
- メール送信サービスとの連携が必要
- 即時性は Web Push より劣る場合がある
- メールアドレスが必須

**修正箇所**
- `public/embed.html` … `[[UADDRESS]]` を取得して API に送信
- `src/handlers/chat.js` または別ハンドラ … メール送信処理を追加
- 外部サービス（Resend 等）の API キーを secrets で管理

---

### 代替案 4: **外部サイトに SW/manifest を配置してもらう**

**内容**
- 外部サイト運営者に、当方の `sw.js` と `manifest.webmanifest` を彼らのサーバーに配置してもらう
- 例: `https://外部サイト/sw.js`, `https://外部サイト/manifest.webmanifest`

**メリット**
- 埋め込み方法を大きく変えずに Web Push が使える可能性

**デメリット**
- 外部サイト側の協力が必須
- ドメインごとに設定が必要
- 運用・保守の負担が増える
- 現実的かは運営体制次第

---

## D) 結論と推奨

| 構成 | Web Push 可否 |
|------|---------------|
| 現状（外部サイトにインライン埋め込み） | **不可** |
| iframe で Worker の embed を埋め込み | **可** |
| Worker のチャット専用ページにリンク誘導 | **可** |
| メール通知（[[UADDRESS]]） | **可**（Web Push ではない） |

**推奨**
1. **Web Push を優先する場合**: **iframe 埋め込み**（代替案 1）への切り替えを検討
2. **埋め込み形態を変えたくない場合**: **メール通知**（代替案 3）を検討
3. **両方**: iframe で Web Push を有効化しつつ、メールをフォールバックとして併用
