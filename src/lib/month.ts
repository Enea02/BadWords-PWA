/** Mese corrente nel fuso del gruppo (Europe/Rome di default). Puro: gira su server e client. */

export const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export type MonthInfo = {
  /** Primo giorno del mese, "YYYY-MM-01": come stamps.month. */
  month: string;
  year: number;
  label: string;
  day: number;
  daysInMonth: number;
  daysLeft: number;
  daysLabel: string;
};

function partsIn(tz: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function monthInfo(tz: string, now: Date = new Date()): MonthInfo {
  const { y, m, d } = partsIn(tz, now);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysLeft = daysInMonth - d;
  return {
    month: `${y}-${String(m).padStart(2, "0")}-01`,
    year: y,
    label: MONTHS[m - 1],
    day: d,
    daysInMonth,
    daysLeft,
    daysLabel: daysLeft === 0 ? "Ultimo giorno" : daysLeft === 1 ? "Manca 1 giorno" : `Mancano ${daysLeft} giorni`,
  };
}

/** "16 nov" nel fuso del gruppo. */
export function shortDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: tz, day: "numeric", month: "short" })
    .format(new Date(iso))
    .replace(".", "");
}

/** "oggi 14:32", "ieri 09:10", "12 nov 18:05". */
export function stampTime(iso: string, tz: string, now: Date = new Date()) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("it-IT", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(date);
  const a = partsIn(tz, date);
  const b = partsIn(tz, now);
  const sameDay = a.y === b.y && a.m === b.m && a.d === b.d;
  const yest = partsIn(tz, new Date(now.getTime() - 86_400_000));
  const isYesterday = a.y === yest.y && a.m === yest.m && a.d === yest.d;
  return `${sameDay ? "oggi" : isYesterday ? "ieri" : shortDate(iso, tz)} ${time}`;
}

/** "oggi", "ieri" o "16 nov" nel fuso del gruppo. */
export function relativeDay(iso: string, tz: string, now: Date = new Date()) {
  return stampTime(iso, tz, now).replace(/ \d{2}:\d{2}$/, "");
}

/** "18·11·26" come sul biglietto della penitenza. */
export function ticketDate(iso: string, tz: string) {
  const p = new Intl.DateTimeFormat("it-IT", { timeZone: tz, day: "2-digit", month: "2-digit", year: "2-digit" }).formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value;
  return `${get("day")}·${get("month")}·${get("year")}`;
}
