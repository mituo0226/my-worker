export function buildTimeContextTokyo() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";

  const period =
    hh >= 5 && hh <= 10 ? "朝" :
    hh >= 11 && hh <= 16 ? "昼" :
    hh >= 17 && hh <= 18 ? "夕方" :
    "夜";

  return `【現在時刻(日本時間)】${hh}:${mm}／時間帯:${period}。この情報を絶対基準にし、時間帯を誤認しない。ユーザーが時刻を示した場合はそれを最優先。`;
}
