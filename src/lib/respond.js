export function getCorsHeaders(_env) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  };
}

export function json(data, status = 200, env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...getCorsHeaders(env),
    },
  });
}

export function preflight(env) {
  return json({ ok: true }, 200, env);
}

export async function withCors(fn, env) {
  try {
    const res = await fn();
    return res;
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500, env);
  }
}

