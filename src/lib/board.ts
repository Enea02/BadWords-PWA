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

/**
 * Totale del mese per ragazza: somma di TUTTE le sue celle, anche delle voci disattivate
 * (i timbri già dati restano validi), come fa il database per le soglie.
 */
export function totalsOf(girls: Girl[], counts: Counts) {
  const byGirl = new Map<string, number>();
  for (const [key, n] of Object.entries(counts)) {
    const id = key.slice(0, key.indexOf(":"));
    byGirl.set(id, (byGirl.get(id) ?? 0) + n);
  }
  return girls.map((g) => byGirl.get(g.id) ?? 0);
}

/** Prossima soglia (multipli di `every`, default 10). Se il totale è esattamente su una soglia (>0), la penitenza è appena scattata. */
export function progress(n: number, every = 10) {
  const unlocked = n > 0 && n % every === 0;
  const next = unlocked ? n : Math.floor(n / every) * every + every;
  const pct = unlocked ? 100 : ((n - (next - every)) / every) * 100;
  const hot = !unlocked && next - n === 1;
  return { next, pct, hot, unlocked };
}

const join = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

/** Riga di stato sotto il mese, come nella board: chi guida e chi è a un passo. */
const timbri = (n: number) => `${n} ${n === 1 ? "timbro" : "timbri"}`;

export function statusLine(girls: Girl[], totals: number[], meId: string, every = 10) {
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

  const near = totals.flatMap((t, i) => (t > 0 && t % every === every - 1 ? [i] : []));
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
