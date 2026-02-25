import { getSystemPrompt } from "../personas/junya.js";

export function buildMessages({ history = [], userMessage = "", nickname = "" }) {
  const system = getSystemPrompt({ nickname });
  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: userMessage },
  ];
}
