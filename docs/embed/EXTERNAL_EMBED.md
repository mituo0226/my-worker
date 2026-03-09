# 外部サイトへのチャット埋め込み

このプロジェクトの Worker は、外部サイトのフリースペース（フリーページ）に埋め込むチャット用です。

## 設置方法

- **形式**: 完全な HTML ドキュメントではなく、**body 以下から** 貼り付ける形
- **貼り付け先**: 外部サイトのフリーページに、以下を貼り付ける

## 貼り付け用コードの構造

1. **ルート要素**: `<div id="ai-chat-root"></div>` を配置
2. **script 内**:
   - `API_URL`: Worker のエンドポイント `https://worker.mituo0226.workers.dev/api/chat`
   - `userId`: `[[UID]]` または localStorage / safeUUID で決定
   - `nickname`: `[[UNAME]]` または `window.CURRENT_USERNAME`
   - POST で `{ userId, nickname, message }` を JSON body として送信

## API の仕様（Worker 側）

- **チャット**: `POST /api/chat` — Body: `{ userId, message, nickname? }` → `{ ok, reply, ... }`
- **初回挨拶**: `POST /api/chat/greeting` — Body: `{ userId, nickname? }` → `{ ok, greeting }`  
  - 履歴なし: 静的挨拶を返す  
  - 履歴あり: AI が過去会話を踏まえた挨拶を生成

## プレースホルダ

外部サイト側で置換される想定:

- `[[UID]]` … ログインID（外部のユーザーID、あれば）
- `[[UPASS]]` … パスワード（あれば・チャット画面上に表示）
- `[[UNAME]]` … 外部のユーザー名・ニックネーム（あれば）
- `[[UADDRESS]]` … ユーザーのメールアドレス（あれば・通知用）

置換されない場合は localStorage や `window.CURRENT_USERNAME` などにフォールバック。email は空になる。

## 貼り付け用コード（参考）

LINE風デザイン。PCはスマホサイズ（max-width: 420px）で中央表示、スマホは全幅。

```html
<style>
#ai-chat-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif; }
.ai-chat-wrap { max-width: 420px; margin: 0 auto; height: 100%; min-height: 500px; display: flex; flex-direction: column; background: #e5ddd5; box-shadow: 0 0 12px rgba(0,0,0,0.15); }
.ai-chat-header { background: #07c755; color: #fff; padding: 14px 16px; font-size: 17px; font-weight: 600; flex-shrink: 0; }
.ai-chat-log { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; -webkit-overflow-scrolling: touch; }
.ai-chat-msg { max-width: 78%; padding: 10px 14px; border-radius: 18px; font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.ai-chat-msg.assistant { align-self: flex-start; background: #fff; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
.ai-chat-msg.user { align-self: flex-end; background: #95ec69; color: #333; border-bottom-right-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
.ai-chat-input-wrap { padding: 10px 12px; background: #f7f7f7; flex-shrink: 0; display: flex; gap: 8px; align-items: center; }
.ai-chat-input { flex: 1; padding: 12px 16px; border: none; border-radius: 24px; font-size: 16px; background: #fff; -webkit-appearance: none; appearance: none; }
.ai-chat-send { width: 48px; height: 48px; min-width: 48px; border: none; border-radius: 50%; background: #07c755; color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ai-chat-send:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-chat-warn { padding: 8px 12px; font-size: 13px; color: #c00; }
.ai-chat-dbg { padding: 6px 12px; font-size: 11px; color: #666; }
@media (min-width: 421px) { .ai-chat-wrap { min-height: 600px; height: 600px; } }
</style>
<div id="ai-chat-root"></div>
<script>
(function () {

  function safeUUID() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return "u-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  const API_URL = "https://worker.mituo0226.workers.dev/api/chat";

  const externalUid = ("[[UID]]" || "").toString().trim();
  const externalUname = ("[[UNAME]]" || "").toString().trim();

  const hasExternalUid = externalUid && !externalUid.includes("[[");
  const hasExternalUname = externalUname && !externalUname.includes("[[");

  let userId = "";
  try {
    userId = hasExternalUid
      ? externalUid
      : (localStorage.getItem("ai_user_id") || safeUUID());
    localStorage.setItem("ai_user_id", userId);
  } catch (e) {
    userId = hasExternalUid ? externalUid : safeUUID();
  }

  const nickname = (
    hasExternalUname ? externalUname : (window.CURRENT_USERNAME || "")
  ).toString().trim();

  const root = document.getElementById("ai-chat-root");
  if (!root) return;

  root.innerHTML = `
    <div class="ai-chat-wrap">
      <div class="ai-chat-header">佐藤淳也</div>
      <div id="log" class="ai-chat-log"></div>
      <div id="warn" class="ai-chat-warn" style="display:none;"></div>
      <div class="ai-chat-input-wrap">
        <input id="msg" class="ai-chat-input" type="text" placeholder="メッセージ" enterkeyhint="send" />
        <button id="send" class="ai-chat-send" aria-label="送信">➤</button>
      </div>
      <div id="dbg" class="ai-chat-dbg"></div>
    </div>
  `;

  const logEl = document.getElementById("log");
  const msgEl = document.getElementById("msg");
  const sendEl = document.getElementById("send");
  const warnEl = document.getElementById("warn");
  const dbgEl = document.getElementById("dbg");

  let history = [];

  function addLine(role, text) {
    const div = document.createElement("div");
    div.className = "ai-chat-msg " + role;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    history.push({ role, content: text });
  }

  function showWarn(msg) {
    warnEl.textContent = msg;
    warnEl.style.display = msg ? "block" : "none";
  }

  async function send() {
    const text = (msgEl.value || "").trim();
    if (!text) return;

    showWarn("");
    addLine("user", text);
    msgEl.value = "";
    sendEl.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          userId: userId,
          nickname: nickname,
          message: text
        })
      });

      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        showWarn("APIエラー: " + res.status + " " + raw.slice(0, 200));
        addLine("assistant", "サーバー側でエラーが出たみたい。少し待ってもう一度送ってみて");
        return;
      }

      addLine(
        "assistant",
        (data && data.reply)
          ? data.reply
          : "ごめん、今ちょっと途切れた…。もう一回言って？"
      );

    } catch (e) {
      showWarn("通信エラー: " + String(e));
      addLine("assistant", "通信エラーが出たみたい。しばらくしてからもう一度送ってみて");
    } finally {
      sendEl.disabled = false;
      msgEl.focus();
    }
  }

  sendEl.addEventListener("click", send);
  msgEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  (async function showGreeting() {
    const GREETING_URL = API_URL.replace("/chat", "/chat/greeting");
    try {
      const res = await fetch(GREETING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ userId, nickname })
      });
      const data = await res.json().catch(() => ({}));
      addLine("assistant", (data && data.greeting) || "これからはこのチャットで話そうね、返信してみてくれないかなよろしく");
    } catch {
      addLine("assistant", "これからはこのチャットで話そうね、返信してみてくれないかなよろしく");
    }
  })();

  dbgEl.textContent =
    "debug: script ok / API_URL=" + API_URL +
    " / userId=" + userId +
    (nickname ? " / nickname=" + nickname : "") +
    (hasExternalUid ? " / uid=external" : " / uid=local") +
    (hasExternalUname ? " / uname=external" : " / uname=local");

})();
</script>
```

## 備考

- このコードは ChatGPT が作成。Worker 側（本プロジェクト）は Cursor でリファクタ・保守
- **CORS**: Worker は `Access-Control-Allow-Origin: *` を返すため、どのドメインからでも呼び出し可能（URL による Origin 制限は廃止済み）
- **テスト**: 本番環境のチャット画面から動作確認することを推奨
