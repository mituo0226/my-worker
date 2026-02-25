# 通信エラー「TypeError: Failed to fetch」の原因切り分け

## 状況（スクリーンショットより）

- フロント: `http://pc24nghnx02.biz/free/c/Chat`（保護されていない通信 = HTTP）
- API: `https://worker.mituo0226.workers.dev/api/chat`
- デバッグ表示: `userId=08054107726`, `nickname=みつお`
- Network タブにリクエストが出ていない → **ブラウザが送信前／受信後にブロックしている可能性が高い**

---

## 想定原因（優先順）

### 1. CORS の Origin 不一致（最有力）

Worker で **ALLOWED_ORIGIN** を設定している場合の動き:

- 許可している例: `https://pc24nghnx02.biz`
- 実際のページ: **http**://pc24nghnx02.biz

→ リクエストの `Origin` は `http://pc24nghnx02.biz` のため、一致せず Worker が 403 を返す。  
→ ブラウザは CORS エラーとして「Failed to fetch」にし、レスポンスを JS に渡さない（Network に赤／ブロックとして出ることもある）。

**確認・対応:**

- Cloudflare ダッシュボード → Worker → 設定 → 変数／シークレットで **ALLOWED_ORIGIN** を確認。
- **HTTP でアクセスするなら** 次のどちらか:
  - `ALLOWED_ORIGIN` を **`http://pc24nghnx02.biz`** に合わせる（HTTP 用）
  - または一旦 **ALLOWED_ORIGIN を未設定** にして `*` 許可で動作確認（本番は後で絞る）

※ HTTPS と HTTP は別 Origin なので、`https://...` だけ許可していると HTTP のページからは弾かれる。

---

### 2. リクエスト先 URL の誤り

デバッグの `API_URL=https://worker.mituo0226.workers.dev/api/chat/userId=08054107726/nickname=みつお` が  
「パスに userId / nickname をくっつけている」ように見える場合:

- Worker が受け付けるのは **pathname が `/api/chat` だけ**（POST）。
- `/api/chat/userId=.../nickname=...` のようなパスだと **404** になる。
- 404 でも CORS ヘッダは付くが、フロントが「失敗」として `fetch` を throw していると「Failed to fetch」のように見える。

**確認・対応:**

- フロントでは **必ず**  
  `POST https://worker.mituo0226.workers.dev/api/chat`  
  のみ（パスは `/api/chat` まで）。
- `userId` / `nickname` / `message` は **Body（JSON）** で送る。

  ```json
  { "userId": "08054107726", "message": "本文", "nickname": "みつお" }
  ```

- URL にクエリで付ける場合は  
  `https://worker.mituo0226.workers.dev/api/chat?userId=...` のように **path は /api/chat のまま** にする（Worker は現状 body の `userId` 等だけ参照しているので、クエリは未使用なら body 推奨）。

---

### 3. その他（参考）

- **Mixed Content**: ページが HTTP で API が HTTPS の場合は、多くのブラウザでは fetch は許可される。まずは上記 1・2 を優先してよい。
- **CSP**: 埋め込み元サイトの CSP で `worker.mituo0226.workers.dev` が禁止されていないかは、Console に CSP 違反のログが出ていないかで確認可能。

---

## 推奨アクション

1. **Cloudflare で ALLOWED_ORIGIN を確認**
   - 設定されていて `https://...` のみ → `http://pc24nghnx02.biz` を許可するか、テストのため未設定（`*`）にする。
2. **フロントのリクエストを確認**
   - 送信 URL が **`/api/chat` のみ** であること。
   - Body が **JSON で `userId` / `message`（と必要なら `nickname`）** であること。
3. 上記を直したうえで **再送信** し、Network タブで「Fetch/XHR」にリクエストが出るか・ステータスが 200/403/404 のどれかを見る。

原因が「CORS の Origin」か「URL/body の誤り」かは、この 2 点の確認でほぼ切り分けできます。
