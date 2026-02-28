/**
 * Resend API でメール送信
 * キャラクター名は env.CHAT_CHARACTER_NAME で指定（未設定時は「佐藤淳也」）
 */

const DEFAULT_CHARACTER_NAME = "佐藤淳也";
const RESEND_API = "https://api.resend.com/emails";

function isValidEmail(s) {
  if (!s || typeof s !== "string") return false;
  const trimmed = s.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * 新着メッセージ通知メールを送信
 * @param {object} env - Worker env
 * @param {{ to: string, characterName?: string, replyPreview?: string }} opts
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

  const characterName =
    (env.CHAT_CHARACTER_NAME || opts.characterName || DEFAULT_CHARACTER_NAME)
      .toString()
      .trim() || DEFAULT_CHARACTER_NAME;

  const from = env.RESEND_FROM_EMAIL || `"${characterName}" <onboarding@resend.dev>`;

  const subject = `【${characterName}】からメッセージが届きました`;
  const html = `
<p>${characterName}からメッセージが届きました。</p>
<p>チャットを開いてご確認ください。</p>
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
