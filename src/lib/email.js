/**
 * Resend API でメール送信
 * メール送信者名は env.EMAIL_SENDER_NAME で指定（未設定時は「【chatセンター】」）
 * ※チャットの応答キャラ名（CHAT_CHARACTER_NAME）とは別。通知メールは番組全体の窓口として送信。
 */

const DEFAULT_SENDER_NAME = "【chatセンター】";
const RESEND_API = "https://api.resend.com/emails";

/** "名前" <addr@example.com> または addr@example.com からメールアドレス部分を抽出 */
function extractEmailFromFromField(fromStr) {
  if (!fromStr || typeof fromStr !== "string") return "";
  const s = fromStr.trim();
  const angle = s.indexOf("<");
  if (angle !== -1) {
    const close = s.indexOf(">", angle);
    if (close !== -1) return s.slice(angle + 1, close).trim();
  }
  return s;
}

function isValidEmail(s) {
  if (!s || typeof s !== "string") return false;
  const trimmed = s.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function escapeHtml(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DEFAULT_CHARACTER_NAME = "佐藤淳也";

/**
 * 新着メッセージ通知メールを送信
 * @param {object} env - Worker env
 * @param {{ to: string, senderName?: string, characterName?: string, chatUrl?: string, loginId?: string, password?: string }} opts
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendNotificationEmail(env, opts) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || typeof apiKey !== "string") {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const to = (opts.to || "").trim();
  if (!isValidEmail(to)) {
    return { ok: false, error: "Invalid email" };
  }

  const senderName =
    (env.EMAIL_SENDER_NAME || opts.senderName || DEFAULT_SENDER_NAME)
      .toString()
      .trim() || DEFAULT_SENDER_NAME;

  const characterName =
    (env.CHAT_CHARACTER_NAME || opts.characterName || DEFAULT_CHARACTER_NAME)
      .toString()
      .trim() || DEFAULT_CHARACTER_NAME;

  let chatUrl = (opts.chatUrl || "").toString().trim();
  if (chatUrl && !/^https?:\/\//i.test(chatUrl)) chatUrl = "";
  if (!chatUrl && env.CHAT_PAGE_URL) {
    const base = String(env.CHAT_PAGE_URL).trim();
    if (/^https?:\/\//i.test(base)) chatUrl = base;
  }
  const chatUrlSection = chatUrl
    ? `<p>チャットURL：<a href="${escapeHtml(chatUrl)}">${escapeHtml(chatUrl)}</a></p>`
    : "";

  const loginId = (opts.loginId || "").toString().trim();
  const password = (opts.password || "").toString().trim();
  const userInfoLines = [];
  if (loginId) userInfoLines.push("あなたのID：" + escapeHtml(loginId));
  if (password) userInfoLines.push("あなたのパスワード：" + escapeHtml(password));
  const userInfoSection =
    userInfoLines.length > 0
      ? "<p>" + userInfoLines.join("<br>") + "</p>"
      : "";

  const fromEmail = env.RESEND_FROM_EMAIL
    ? extractEmailFromFromField(env.RESEND_FROM_EMAIL)
    : "";
  const fromAddr = fromEmail && isValidEmail(fromEmail)
    ? fromEmail
    : "onboarding@resend.dev";
  const from = `"${senderName}" <${fromAddr}>`;

  const subject = `【${senderName}】あなたにメッセージが届きました`;
  const html = `
<p>【${escapeHtml(characterName)}】様からメッセージが届きました。</p>
<p>チャットを開いてご確認ください。</p>
${userInfoSection}
${chatUrlSection}
`.trim();

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.message || `Resend API ${res.status}`,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
