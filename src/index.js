import { json, preflight, withCors } from "./lib/respond.js";
import { handleChat } from "./handlers/chat.js";
import { handleGreeting } from "./handlers/greeting.js";
import { handleEmailTest } from "./handlers/email-test.js";

export default {
  async fetch(req, env, ctx) {
    if (req.method === "OPTIONS") return preflight(env);

    const url = new URL(req.url);

    if (url.pathname === "/api/chat" && req.method === "POST") {
      return withCors(() => handleChat(req, env, ctx), env);
    }

    if (url.pathname === "/api/chat/greeting" && req.method === "POST") {
      return withCors(() => handleGreeting(req, env), env);
    }

    if (url.pathname === "/api/email/test" && req.method === "POST") {
      return withCors(() => handleEmailTest(req, env), env);
    }

    return json({ ok: false, error: "Not Found" }, 404, env);
  },
};
