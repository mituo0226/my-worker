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

- `[[UID]]` … 外部のユーザーID（あれば）
- `[[UNAME]]` … 外部のユーザー名・ニックネーム（あれば）

置換されない場合は localStorage や `window.CURRENT_USERNAME` などにフォールバック。

## 貼り付け用コード（参考）

```html
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
    <div>
      <div><b>佐藤淳也</b></div>
      <div id="log" style="border:1px solid #ccc; padding:10px; height:300px; overflow:auto; white-space:pre-wrap;"></div>
      <div style="margin-top:10px;">
        <input id="msg" type="text" placeholder="メッセージ…" style="width:75%;" />
        <button id="send">送信</button>
      </div>
      <div id="warn" style="margin-top:8px; color:red;"></div>
      <div id="dbg" style="margin-top:6px; font-size:12px;"></div>
    </div>
  `;

  const logEl = document.getElementById("log");
  const msgEl = document.getElementById("msg");
  const sendEl = document.getElementById("send");
  const warnEl = document.getElementById("warn");
  const dbgEl = document.getElementById("dbg");

  let history = [];

  function addLine(role, text) {
    const label = role === "user" ? "あなた" : "淳也";
    logEl.textContent += (logEl.textContent ? "\n\n" : "") + label + "：\n" + text;
    logEl.scrollTop = logEl.scrollHeight;
    history.push({ role, content: text });
  }

  async function send() {
    const text = (msgEl.value || "").trim();
    if (!text) return;

    warnEl.textContent = "";
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
        warnEl.textContent =
          "APIエラー: " + res.status + " " + res.statusText +
          " / " + raw.slice(0, 300);
        addLine("assistant", "（サーバー側でエラーが出たみたい。少し待ってもう一度送ってみて）");
        return;
      }

      addLine(
        "assistant",
        (data && data.reply)
          ? data.reply
          : "ごめん、今ちょっと途切れた…。もう一回言って？"
      );

    } catch (e) {
      warnEl.textContent = "通信エラー: " + String(e);
    } finally {
      sendEl.disabled = false;
      msgEl.focus();
    }
  }

  sendEl.addEventListener("click", send);
  msgEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
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
