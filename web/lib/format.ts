const TIME_ZONE = "America/Argentina/Mendoza";

const cierreFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

export function formatCierre(unixSeconds: number): string {
  return cierreFormat.format(new Date(unixSeconds * 1000));
}

export function formatRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  const secs = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

const relative = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

export function formatAgo(iso: string, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - Math.floor(Date.parse(iso) / 1000));
  if (diff < 60) return "recién";
  if (diff < 3_600) return relative.format(-Math.floor(diff / 60), "minute");
  if (diff < 86_400) return relative.format(-Math.floor(diff / 3_600), "hour");
  return relative.format(-Math.floor(diff / 86_400), "day");
}
