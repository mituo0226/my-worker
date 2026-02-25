import { json, preflight, withCors } from "./lib/respond.js";
import { handleChat } from "./handlers/chat.js";

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return preflight(env);

    const url = new URL(req.url);

    if (url.pathname === "/api/chat" && req.method === "POST") {
      return withCors(() => handleChat(req, env), env);
    }

    return json({ ok: false, error: "Not Found" }, 404, env);
  },
};
