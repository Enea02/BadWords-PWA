import type { StampIcon } from "@design/Stamp";
import type { GirlColor } from "@design/girls";

export type Girl = {
  id: string;
  name: string;
  color: GirlColor;
  avatarUrl: string | null;
  role: "admin" | "member";
};

export type Word = { id: string; label: string; icon: StampIcon };

/** Conteggi del mese: chiave `${profileId}:${wordId}`. */
export type Counts = Record<string, number>;

export const cellKey = (profileId: string, wordId: string) => `${profileId}:${wordId}`;

/** Rotazione deterministica dei timbri in una cella (stessa formula del design). */
export const stampRot = (wi: number, gi: number, k: number) => ((wi * 7 + gi * 13 + k * 29 + 5) % 27) - 13;

export function totalsOf(girls: Girl[], words: Word[], counts: Counts) {
  return girls.map((g) => words.reduce((sum, w) => sum + (counts[cellKey(g.id, w.id)] ?? 0), 0));
}

/** Prossima soglia: 10, 20, 30… Se il totale è esattamente su una soglia (>0), la penitenza è appena scattata. */
export function progress(n: number) {
  const unlocked = n > 0 && n % 10 === 0;
  const next = unlocked ? n : Math.floor(n / 10) * 10 + 10;
  const pct = unlocked ? 100 : (n - (next - 10)) * 10;
  const hot = !unlocked && next - n === 1;
  return { next, pct, hot, unlocked };
}

const join = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

/** Riga di stato sotto il mese, come nella board: chi guida e chi è a un passo. */
const timbri = (n: number) => `${n} ${n === 1 ? "timbro" : "timbri"}`;

export function statusLine(girls: Girl[], totals: number[], meId: string) {
  const max = Math.max(0, ...totals);
  if (max === 0) return "Cartoncino nuovo, bocca pulita. Per ora.";

  const name = (i: number) => (girls[i].id === meId ? "tu" : girls[i].name);
  const leaders = totals.flatMap((t, i) => (t === max ? [i] : []));
  const lead =
    leaders.length === 1
      ? girls[leaders[0]].id === meId
        ? `Guidi tu con ${timbri(max)}.`
        : `${girls[leaders[0]].name} guida con ${timbri(max)}.`
      : `${join(leaders.map(name))} in testa con ${timbri(max)}.`;

  const near = totals.flatMap((t, i) => (t % 10 === 9 ? [i] : []));
  const others = near.filter((i) => girls[i].id !== meId).map((i) => girls[i].name);
  const meNear = near.some((i) => girls[i].id === meId);
  // "Marta guida con 9 timbri ed è a un timbro dalla penitenza."
  if (leaders.length === 1 && near.length === 1 && near[0] === leaders[0]) {
    return girls[leaders[0]].id === meId
      ? `Guidi tu con ${timbri(max)} e sei a un timbro dalla penitenza.`
      : `${girls[leaders[0]].name} guida con ${timbri(max)} ed è a un timbro dalla penitenza.`;
  }
  const parts = [lead];
  if (others.length) parts.push(`${join(others)} ${others.length === 1 ? "è" : "sono"} a un timbro dalla penitenza.`);
  if (meNear) parts.push(others.length ? "E anche tu." : "Sei a un timbro dalla penitenza.");
  return parts.join(" ");
}

/** UUID v4 anche fuori da un contesto sicuro (es. telefono in LAN su http). */
export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
