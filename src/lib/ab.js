async function hashToBucket(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = new Uint8Array(buf);
  return ((arr[0] << 8) | arr[1]) % 100;
}

export async function getAB(env, userId) {
  const row = await env.DB.prepare(
    "SELECT variant, provider, model FROM ab_assignments WHERE user_id=?"
  ).bind(userId).first();

  if (row) return row;

  const bucket = await hashToBucket(userId);
  const isB = bucket < Number(env.AB_B_PERCENT || 30);

  const variant = isB ? "B" : "A";
  const provider = isB ? "openai" : "deepseek";
  const model = isB 
    ? (env.OPENAI_MODEL || "gpt-4o-mini") 
    : (env.DEEPSEEK_MODEL || "deepseek-chat");

  await env.DB.prepare(
    "INSERT INTO ab_assignments (user_id, variant, provider, model) VALUES (?,?,?,?)"
  ).bind(userId, variant, provider, model).run();

  return { variant, provider, model };
}
