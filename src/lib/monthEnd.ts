import type { SupabaseClient } from "@supabase/supabase-js";
import type { GirlColor } from "@design/girls";
import type { Database } from "@/lib/database.types";
import { MONTHS } from "@/lib/month";

/** Una riga dello snapshot salvato da close_month. */
export type SnapRow = { profile_id: string; display_name: string; color: GirlColor; total: number; rank: number };

export type MonthlyPenance = {
  ids: string[];
  /** null = mazzo vuoto o ancora da decidere. */
  text: string | null;
  awaiting: boolean;
  status: "pending" | "done";
};

export type Closure = {
  month: string;
  snapshot: SnapRow[];
  penance: MonthlyPenance | null;
};

/** Carica i mesi chiusi (più recenti prima) con lo stato della penitenza grossa. La RLS limita al gruppo. */
export async function fetchClosures(supabase: SupabaseClient<Database>, onlyMonth?: string): Promise<Closure[]> {
  let q = supabase.from("month_closures").select("month, snapshot").order("month", { ascending: false });
  if (onlyMonth) q = q.eq("month", onlyMonth);
  const [{ data: closures }, { data: monthly }] = await Promise.all([
    q,
    supabase
      .from("penance_assignments")
      .select("id, month, status, custom, custom_text, penance:penances (text)")
      .eq("kind", "monthly"),
  ]);

  return (closures ?? []).map((c) => {
    const rows = (monthly ?? []).filter((a) => a.month === c.month);
    const first = rows[0];
    return {
      month: c.month,
      snapshot: (c.snapshot as unknown as SnapRow[]) ?? [],
      penance: first
        ? {
            ids: rows.map((r) => r.id),
            text: first.custom_text ?? first.penance?.text ?? null,
            awaiting: first.custom && !first.custom_text,
            status: rows.every((r) => r.status === "done") ? "done" : "pending",
          }
        : null,
    };
  });
}

export const monthTitle = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];
export const monthYear = (month: string) => Number(month.slice(0, 4));

export function nextMonthTitle(month: string) {
  const m = Number(month.slice(5, 7));
  return MONTHS[m % 12].toLowerCase();
}

const join = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

/** Vincitrici, distacco, podio e "fuori dal podio" come nella board FineMese. */
export function summarize(snapshot: SnapRow[]) {
  const rows = [...snapshot].sort((a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name));
  const max = rows[0]?.total ?? 0;
  const winners = max > 0 ? rows.filter((r) => r.total === max) : [];
  const runnerUp = rows.find((r) => r.total < max && r.total > 0);
  const total = rows.reduce((s, r) => s + r.total, 0);

  let subtitle = "";
  if (winners.length === 1) {
    const t = `${max} ${max === 1 ? "timbro" : "timbri"}`;
    subtitle = runnerUp ? `${t}, ${max - runnerUp.total} più di ${runnerUp.display_name}` : t;
  } else if (winners.length > 1) {
    subtitle = `${max} timbri a testa`;
  }

  const podium = rows.slice(0, 3);
  const others = rows.slice(3);
  return {
    rows,
    max,
    total,
    winners,
    winnerNames: join(winners.map((w) => w.display_name)),
    subtitle,
    podium,
    othersLine: others.length ? `Fuori dal podio: ${others.map((o) => `${o.display_name} ${o.total}`).join(" · ")}` : "",
  };
}
