import { TZDate } from "@date-fns/tz";
import { addDays, addWeeks, addYears, format } from "date-fns";
import type { Schedule } from "./model";
export const dateKey = (now = Date.now(), zone = "Asia/Dubai") =>
  format(new TZDate(now, zone), "yyyy-MM-dd");
const instantCache = new Map<string, number>();
export function instant(s: Schedule): number {
  const key = JSON.stringify(s);
  const cached = instantCache.get(key);
  if (cached !== undefined) return cached;
  const [y, m, d] = s.date.split("-").map(Number);
  const [h, min] = (s.allDay ? "09:00" : s.time || "09:00").split(":").map(Number);
  let time = new TZDate(y, m - 1, d, h, min, 0, s.zone).getTime();
  const before = new TZDate(time - 3 * 3600000, s.zone),
    after = new TZDate(time + 3 * 3600000, s.zone);
  if (before.getTimezoneOffset() !== after.getTimezoneOffset()) {
    const target = h * 60 + min;
    for (let t = time - 3 * 3600000; t <= time + 3 * 3600000; t += 60000) {
      const local = new TZDate(t, s.zone);
      if (
        local.getFullYear() === y &&
        local.getMonth() === m - 1 &&
        local.getDate() === d &&
        local.getHours() * 60 + local.getMinutes() >= target
      ) {
        time = t;
        break;
      }
    }
  }
  if (instantCache.size > 5000) instantCache.clear();
  instantCache.set(key, time);
  return time;
}
export function nextSchedule(s: Schedule): Schedule {
  const d = new TZDate(instant(s), s.zone);
  let next =
    s.recurrence === "daily"
      ? addDays(d, 1)
      : s.recurrence === "weekly"
        ? addWeeks(d, 1)
        : addYears(d, 1);
  const origin = s.originDate ?? s.date;
  if (s.recurrence === "yearly") {
    const year = Number(s.date.slice(0, 4)) + 1;
    const month = Number(origin.slice(5, 7)),
      day = Number(origin.slice(8, 10));
    const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
    next = new TZDate(year, month - 1, Math.min(day, max), 12, 0, 0, s.zone);
  }
  return { ...s, date: format(next, "yyyy-MM-dd"), originDate: origin };
}
export function scheduleLabel(s: Schedule, viewerZone?: string): string {
  const d = new TZDate(instant(s), s.zone);
  const adjusted = !s.allDay && format(d, "HH:mm") !== s.time;
  return `${format(d, "EEE, d MMM")}${s.allDay ? " · All day" : ` · ${format(d, "h:mm a")}`}${viewerZone && viewerZone !== s.zone ? ` (${s.zone})` : ""}${adjusted ? " · Adjusted for daylight saving" : ""}`;
}
export function inQuietHours(
  now: number,
  zone: string,
  start: string,
  end: string,
): boolean {
  const local = format(new TZDate(now, zone), "HH:mm");
  return (
    start === end ||
    (start < end ? local >= start && local < end : local >= start || local < end)
  );
}
export function relative(then: number, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - then) / 60000));
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return format(new Date(then), "d MMM");
}
export const daysFrom = (anchor: number, days: number, zone = "Asia/Dubai") =>
  format(addDays(new TZDate(anchor, zone), days), "yyyy-MM-dd");
