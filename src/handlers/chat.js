import { json } from "../lib/respond.js";
import { getAB } from "../lib/ab.js";
import { callProvider } from "../lib/providers.js";
import { buildMessages } from "../lib/messages.js";

export async function handleChat(req, env) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, env);
  }

  const userId = String(body.userId || "").trim();
  const message = String(body.message || "").trim();
  const nickname = String(body.nickname || "");

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

  const rows = await env.DB.prepare(
    "SELECT role, content FROM chat_messages WHERE user_id=? ORDER BY turn_index DESC LIMIT 5"
  ).bind(userId).all();

  const history = (rows.results || []).reverse();

  const messages = buildMessages({ history, userMessage: message, nickname });

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

  return json(
    {
      ok: true,
      reply,
      ab,
      provider_request_id,
      latency_ms: latency,
    },
    200,
    env
  );
}
