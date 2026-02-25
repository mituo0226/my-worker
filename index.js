export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    const json = (data, status = 200, extraHeaders = {}) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "content-type": "application/json; charset=utf-8",
          // 必要ならCORS（埋め込みサイトから叩くなら有効に）
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-headers": "content-type,authorization",
          ...extraHeaders,
        },
      });

    if (req.method === "OPTIONS") return json({ ok: true }, 204);

    // ---------------------------
    // /api/chat : DeepSeek メイン + OpenAI 予備
    // ---------------------------
    if (url.pathname === "/api/chat" && req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch {}

      const userId = String(body.userId || "");
      const message = String(body.message || "");

      if (!userId) return json({ ok: false, error: "userId required" }, 400);
      if (!message) return json({ ok: false, error: "message required" }, 400);

      const start = Date.now();

      // 予備用：OpenAI呼び出し関数
      const callOpenAI = async () => {
        if (!env.OPENAI_API_KEY) {
          return { ok: false, error: "OPENAI_API_KEY missing" };
        }
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: message }],
          }),
        });

        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          return { ok: false, error: "openai_upstream_error", detail };
        }

        const data = await r.json().catch(() => ({}));
        const reply = data.choices?.[0]?.message?.content ?? "";
        return {
          ok: true,
          reply,
          ab: { variant: "B", provider: "openai", model: "gpt-4o-mini" },
          provider_request_id: data.id ?? null,
        };
      };

      // メイン：DeepSeek呼び出し（タイムアウト付き）
      try {
        if (!env.DEEPSEEK_API_KEY) {
          // DeepSeekが無いのは致命的（メイン）
          return json({ ok: false, error: "DEEPSEEK_API_KEY missing" }, 500);
        }

        const ac = new AbortController();
        const timeoutMs = 8000; // 好みで調整（予備に切り替えるまでの待ち）
        const t = setTimeout(() => ac.abort("timeout"), timeoutMs);

        const r = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: message }],
          }),
          signal: ac.signal,
        }).finally(() => clearTimeout(t));

        if (r.ok) {
          const data = await r.json().catch(() => ({}));
          const reply = data.choices?.[0]?.message?.content ?? "";
          return json({
            ok: true,
            reply,
            ab: { variant: "A", provider: "deepseek", model: "deepseek-chat" },
            provider_request_id: data.id ?? null,
            latency_ms: Date.now() - start,
          });
        }

        // DeepSeekが非200 → 予備へ
        const dsDetail = await r.text().catch(() => "");
        const fb = await callOpenAI();

        if (fb.ok) {
          return json({
            ok: true,
            reply: fb.reply,
            ab: fb.ab,
            provider_request_id: fb.provider_request_id,
            latency_ms: Date.now() - start,
            fallback_from: "deepseek",
          });
        }

        // 予備も失敗 → DeepSeekのエラーで返す（診断用にdetailも付ける）
        return json(
          { ok: false, error: "deepseek_upstream_error", detail: dsDetail, fallback_error: fb },
          502
        );
      } catch (err) {
        // DeepSeekがタイムアウト/例外 → 予備へ
        const fb = await callOpenAI();
        if (fb.ok) {
          return json({
            ok: true,
            reply: fb.reply,
            ab: fb.ab,
            provider_request_id: fb.provider_request_id,
            latency_ms: Date.now() - start,
            fallback_from: "deepseek_exception",
          });
        }
        return json(
          { ok: false, error: "deepseek_exception", detail: err?.message ?? String(err), fallback_error: fb },
          502
        );
      }
    }

    // 予備を “明示的に” 叩きたい場合の別口（任意）
    if (url.pathname === "/api/consult" && req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch {}
      const text = (body.text ?? body.prompt ?? body.question ?? "").toString();
      if (!text.trim()) return json({ ok: false, error: "text required" }, 400);

      if (!env.OPENAI_API_KEY) return json({ ok: false, error: "OPENAI_API_KEY missing" }, 500);

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: text }],
        }),
      });

      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        return json({ ok: false, error: "upstream_error", detail }, 502);
      }

      const data = await r.json().catch(() => ({}));
      return json({ ok: true, message: data.choices?.[0]?.message?.content ?? "" });
    }

    return json({ ok: false, error: "Not Found" }, 404);
  },
};