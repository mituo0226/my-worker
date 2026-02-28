import { json } from "../lib/respond.js";
import { sendNotificationEmail } from "../lib/email.js";

/**
 * メール送信のテスト用エンドポイント
 * POST /api/email/test  body: { to: "email@example.com" }
 */
export async function handleEmailTest(req, env) {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, env);
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, env);
  }

  const to = String(body.to || "").trim();
  if (!to) {
    return json(
      {
        ok: false,
        error: "to required",
        hint: 'body: { "to": "your@email.com" }',
      },
      400,
      env
    );
  }

  const hasApiKey = !!(env.RESEND_API_KEY && typeof env.RESEND_API_KEY === "string");
  const fromRaw = env.RESEND_FROM_EMAIL;
  const hasFrom = !!(fromRaw && typeof fromRaw === "string");
  const fromDomain = hasFrom && fromRaw.includes("@")
    ? fromRaw.split("@").pop()?.replace(">", "").trim() || "(unknown)"
    : null;

  let chatUrl = String(body.chatUrl || "").trim();
  if (chatUrl && !/^https?:\/\//i.test(chatUrl)) chatUrl = "";
  if (!chatUrl && env.CHAT_PAGE_URL) {
    const base = String(env.CHAT_PAGE_URL).trim();
    if (/^https?:\/\//i.test(base)) chatUrl = base;
  }
  const loginId = String(body.loginId || "").trim();
  const password = String(body.password || "").trim();
  const result = await sendNotificationEmail(env, {
    to,
    chatUrl: chatUrl || undefined,
    loginId: loginId || undefined,
    password: password || undefined,
  });

  return json(
    {
      ok: result.ok,
      error: result.error,
      _debug: { hasApiKey, hasFrom, fromDomain, to, chatUrlIncluded: chatUrl || null, loginIdIncluded: !!loginId, passwordIncluded: !!password },
    },
    result.ok ? 200 : 500,
    env
  );
}
