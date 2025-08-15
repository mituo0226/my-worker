// functions/api/consult.js
export const onRequestPost = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));
  const { category } = body || {};
  const text = (body.text ?? body.prompt ?? body.question ?? "").toString();

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "穏やかな占い師として答えてください。" },
          { role: "user", content: category ? `【相談ジャンル】${category}\n【相談内容】${text}` : text }
        ]
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: "upstream_error" }),
        { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } });
    }

    const data = await r.json();
    return new Response(JSON.stringify({ message: data.choices?.[0]?.message?.content ?? "" }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", detail: err.message }), {
      status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
