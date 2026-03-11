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

  const ab = await getAB(env, userId);
  const turnCount = Math.max(1, Number(turnRow?.c ?? 0) + 1);
  const system = getSystemPrompt({ nickname, turnCount });
  const timeContext = buildTimeContextTokyo();

  if (history.length === 0) {
    const firstGreetingPrompt = `【初回挨拶の指示】
上記「一日のスケジュール」と【現在時刻(日本時間)】を絶対基準に、次の2つを1文にまとめて出力すること。
1) 今この瞬間、淳也が何をしているか（場所・行動を具体的に。例: アルバイト終わってシャワー浴びて、これからレッスンに向かうところ 等）
2) これからチャットで話そう、という温かい誘い（「返信してみてくれないかな」「よろしく」等）
曖昧な「のんびりしてた」は禁止。50〜100字。挨拶の文言のみ。`;
    const messages = [
      { role: "system", content: system + "\n\n" + firstGreetingPrompt },
      { role: "user", content: "今の自分の様子（スケジュールと時刻に沿って具体的に）と、初めて会う相手への挨拶を1文で出力して。" },
    ];
    messages.unshift({ role: "system", content: timeContext });
    try {
      const result = await callProvider(env, ab, messages);
      const greeting = (result.reply || "").trim() || STATIC_GREETING;
      return json({ ok: true, greeting }, 200, env);
    } catch {
      return json({ ok: true, greeting: STATIC_GREETING }, 200, env);
    }
  }

  const greetingPrompt = `【挨拶の指示】
あなたは佐藤淳也。このユーザーとは過去に会話している。
上記「一日のスケジュール」と【現在時刻(日本時間)】を絶対基準に、次の2つを1文にまとめて出力すること。
1) 今この瞬間、淳也が何をしているか（場所・行動を具体的に。例: アルバイト終わってシャワー浴びて、これからレッスンに向かうところ／レッスン終わって移動中／カフェで一息ついてるとこ 等）
2) 再訪した相手への温かい迎え（「また話せて嬉しい」等）
曖昧な「のんびりしてた」は禁止。50〜100字。挨拶の文言のみ。`;

  const messages = [
    { role: "system", content: system + "\n\n" + greetingPrompt },
    ...history,
    { role: "user", content: "今の自分の様子（スケジュールと時刻に沿って具体的に）と、再訪した相手への挨拶を1文で出力して。" },
  ];
  messages.unshift({ role: "system", content: timeContext });

  try {
    const result = await callProvider(env, ab, messages);
    const greeting = (result.reply || "").trim() || STATIC_GREETING;
    return json({ ok: true, greeting }, 200, env);
  } catch {
    return json({ ok: true, greeting: STATIC_GREETING }, 200, env);
  }
}
