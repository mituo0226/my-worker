import { json } from "../lib/respond.js";
import { getAB } from "../lib/ab.js";
import { callProvider } from "../lib/providers.js";
import { buildMessages } from "../lib/messages.js";
import { buildTimeContextTokyo } from "../lib/time.js";
import { sendNotificationEmail } from "../lib/email.js";

export async function handleChat(req, env, ctx) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, env);
  }

  const userId = String(body.userId || "").trim();
  const message = String(body.message || "").trim();
  const nickname = String(body.nickname || "");
  const email = String(body.email || "").trim();
  const chatUrl = String(body.chatUrl || "").trim();
  const password = String(body.password || "").trim();

  if (!userId) return json({ ok: false, error: "userId required" }, 400, env);
  if (!message) return json({ ok: false, error: "message required" }, 400, env);

  const MAX_CHARS = Number(env.MAX_MESSAGE_CHARS || 2500);
  if (message.length > MAX_CHARS) {
    return json(
      { ok: false, error: `message too long (max ${MAX_CHARS})` },
      413,
      env
    );
  }

  const start = Date.now();

  const ab = await getAB(env, userId);

  const [rows, turnRow] = await Promise.all([
    env.DB.prepare(
      "SELECT role, content FROM chat_messages WHERE user_id=? ORDER BY turn_index DESC LIMIT 5"
    ).bind(userId).all(),
    env.DB.prepare(
      "SELECT COUNT(*) as c FROM chat_messages WHERE user_id=? AND role='assistant'"
    ).bind(userId).first(),
  ]);

  const history = (rows.results || []).reverse();
  const turnCount = Math.max(1, Number(turnRow?.c ?? 0) + 1);

  const messages = buildMessages({ history, userMessage: message, nickname, turnCount });
  messages.unshift({ role: "system", content: buildTimeContextTokyo() });

  let reply = "";
  let provider_request_id = null;

  try {
    const result = await callProvider(env, ab, messages);
    reply = result.reply || "";
    provider_request_id = result.provider_request_id || null;
  } catch (e) {
    return json({ ok: false, error: "Fetch failed", detail: String(e) }, 502, env);
  }

  if (!reply) reply = "少し途切れたかも。もう一度言って？";

  const maxRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(turn_index),0) m FROM chat_messages WHERE user_id=?"
  ).bind(userId).first();

  const base = Number(maxRow?.m || 0);

  await env.DB.prepare(
    "INSERT INTO chat_messages (user_id, turn_index, role, content) VALUES (?,?,?,?)"
  ).bind(userId, base + 1, "user", message).run();

  await env.DB.prepare(
    "INSERT INTO chat_messages (user_id, turn_index, role, content) VALUES (?,?,?,?)"
  ).bind(userId, base + 2, "assistant", reply).run();

  const latency = Date.now() - start;

  await env.DB.prepare(
    "INSERT INTO chat_runs (user_id, variant, provider, model, input_chars, output_chars, latency_ms, provider_request_id) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(
    userId,
    ab.variant,
    ab.provider,
    ab.model,
    message.length,
    reply.length,
    latency,
    provider_request_id
  ).run();

  if (password) {
    await env.DB.prepare(
      "INSERT INTO user_passwords (user_id, password, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(user_id) DO UPDATE SET password=excluded.password, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
    )
      .bind(userId, password)
      .run();
  }

  let urlToInclude = undefined;
  if (email && env.RESEND_API_KEY) {
    const throttleRow = await env.DB.prepare(
      "SELECT last_sent_at FROM email_notification_throttle WHERE email = ?"
    )
      .bind(email)
      .first();
    const lastSentAt = throttleRow?.last_sent_at
      ? new Date(throttleRow.last_sent_at).getTime()
      : 0;
    const threeHoursMs = 3 * 60 * 60 * 1000;
    const shouldSend = Date.now() - lastSentAt >= threeHoursMs;

    if (shouldSend) {
      urlToInclude = chatUrl;
      if (!urlToInclude && env.CHAT_PAGE_URL) {
        const base = String(env.CHAT_PAGE_URL).trim();
        if (/^https?:\/\//i.test(base)) urlToInclude = base;
      }
      if (!urlToInclude) {
        try {
          const base = new URL(req.url).origin + "/embed.html";
          const sep = base.includes("?") ? "&" : "?";
          urlToInclude = base + sep + "userId=" + encodeURIComponent(userId);
        } catch {
          urlToInclude = undefined;
        }
      }
      let passwordForEmail = password || undefined;
      if (!passwordForEmail) {
        const stored = await env.DB.prepare(
          "SELECT password FROM user_passwords WHERE user_id=?"
        )
          .bind(userId)
          .first();
        if (stored?.password) passwordForEmail = stored.password;
      }
      const emailPromise = sendNotificationEmail(env, {
        to: email,
        chatUrl: urlToInclude,
        loginId: userId,
        password: passwordForEmail,
      })
        .then(async (result) => {
          if (result?.ok) {
            await env.DB.prepare(
              "INSERT INTO email_notification_throttle (email, last_sent_at) VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(email) DO UPDATE SET last_sent_at=excluded.last_sent_at"
            )
              .bind(email)
              .run();
          }
        })
        .catch((e) => {
          console.error("[email] notification failed:", e);
        });
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(emailPromise);
      } else {
        void emailPromise;
      }
    }
  }

  return json(
    {
      ok: true,
      reply,
      ab,
      provider_request_id,
      latency_ms: latency,
      _email: email || undefined,
      _emailUrl: urlToInclude,
    },
    200,
    env
  );
}
