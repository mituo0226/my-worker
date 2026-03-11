import { getSystemPrompt } from "../personas/junya.js";

export function buildMessages({ history = [], userMessage = "", nickname = "", turnCount = 0 }) {
  const system = getSystemPrompt({ nickname, turnCount });
  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
}
