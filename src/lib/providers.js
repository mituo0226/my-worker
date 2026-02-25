async function safeJson(res) {
  const text = await res.text();
  try {
    return { ok: true, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false, raw: text };
  }
}

export async function callProvider(env, ab, messages) {
  if (ab.provider === "deepseek") {
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + env.DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: ab.model,
        messages,
        temperature: 0.8,
      }),
    });

    const parsed = await safeJson(r);
    if (!r.ok) {
      throw new Error(
        `DeepSeek API error (status ${r.status}): ${parsed.raw?.slice(0, 1000)}`
      );
    }
    if (!parsed.ok) {
      throw new Error(`DeepSeek returned non-JSON: ${parsed.raw?.slice(0, 1000)}`);
    }

    const data = parsed.data;
    return {
      reply: data?.choices?.[0]?.message?.content || "",
      provider_request_id: data?.id || null,
    };
  }

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: ab.model,
      messages,
      temperature: 0.8,
    }),
  });

  const parsed = await safeJson(r);
  if (!r.ok) {
    throw new Error(
      `OpenAI API error (status ${r.status}): ${parsed.raw?.slice(0, 1000)}`
    );
  }
  if (!parsed.ok) {
    throw new Error(`OpenAI returned non-JSON: ${parsed.raw?.slice(0, 1000)}`);
  }

  const data = parsed.data;
  return {
    reply: data?.choices?.[0]?.message?.content || "",
    provider_request_id: data?.id || null,
  };
}
