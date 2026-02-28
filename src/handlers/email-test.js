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

  const chatUrl = String(body.chatUrl || "").trim();
  const result = await sendNotificationEmail(env, {
    to,
    chatUrl: chatUrl || undefined,
  });

  return json(
    {
      ok: result.ok,
      error: result.error,
      _debug: { hasApiKey, hasFrom, fromDomain, to },
    },
    result.ok ? 200 : 500,
    env
  );
}
