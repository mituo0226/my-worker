import { json } from "../lib/respond.js";
import { getAB } from "../lib/ab.js";
import { callProvider } from "../lib/providers.js";
import { getSystemPrompt } from "../personas/junya.js";
import { buildTimeContextTokyo } from "../lib/time.js";

const STATIC_GREETING = "これからはこのチャットで話そうね、返信してみてくれないかなよろしく";

export async function handleGreeting(req, env) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: true, greeting: STATIC_GREETING }, 200, env);
  }

  const userId = String(body.userId || "").trim();
  const nickname = String(body.nickname || "");

  if (!userId) return json({ ok: true, greeting: STATIC_GREETING }, 200, env);

  const [rows, turnRow] = await Promise.all([
    env.DB.prepare(
      "SELECT role, content FROM chat_messages WHERE user_id=? ORDER BY turn_index DESC LIMIT 6"
    ).bind(userId).all(),
    env.DB.prepare(
      "SELECT COUNT(*) as c FROM chat_messages WHERE user_id=? AND role='assistant'"
    ).bind(userId).first(),
  ]);

  const history = (rows.results || []).reverse();

  if (history.length === 0) {
    return json({ ok: true, greeting: STATIC_GREETING }, 200, env);
  }

  const ab = await getAB(env, userId);
  const turnCount = Math.max(1, Number(turnRow?.c ?? 0) + 1);
  const system = getSystemPrompt({ nickname, turnCount });

  const greetingPrompt = `あなたは佐藤淳也。このユーザーとは過去に会話している。
直近の会話を踏まえ、再訪した相手への挨拶を1文（50〜80字）で出力して。
温かく、過去のやり取りを感じさせる迎え方で。出力は挨拶の文言のみ。`;

  const messages = [
    { role: "system", content: system + "\n\n" + greetingPrompt },
    ...history,
    { role: "user", content: "再訪への挨拶を1文で出力して。" },
  ];
  messages.unshift({ role: "system", content: buildTimeContextTokyo() });

  try {
    const result = await callProvider(env, ab, messages);
    const greeting = (result.reply || "").trim() || STATIC_GREETING;
    return json({ ok: true, greeting }, 200, env);
  } catch {
    return json({ ok: true, greeting: STATIC_GREETING }, 200, env);
  }
}
