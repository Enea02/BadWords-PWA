import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { MONTHS } from "@/lib/month";

export type PenanceItem = {
  id: string;
  profileId: string;
  kind: "small" | "monthly";
  month: string;
  threshold: number | null;
  status: "pending" | "done";
  createdAt: string;
  doneAt: string | null;
  acknowledgedAt: string | null;
  /** Testo da mostrare: deciso dall'admin (modalità "sul momento") o dal mazzo. null = mazzo vuoto o da decidere. */
  text: string | null;
  /** Creata in modalità "sul momento". */
  custom: boolean;
  /** true finché l'admin non l'ha scritta. */
  awaiting: boolean;
};

export const FALLBACK_TEXT = "Penitenza a scelta del gruppo";

const SELECT =
  "id, profile_id, kind, month, threshold, status, created_at, done_at, acknowledged_at, custom, custom_text, penance:penances (text)";

type Row = {
  id: string;
  profile_id: string;
  kind: "small" | "monthly";
  month: string;
  threshold: number | null;
  status: "pending" | "done";
  created_at: string;
  done_at: string | null;
  acknowledged_at: string | null;
  custom: boolean;
  custom_text: string | null;
  penance: { text: string } | null;
};

export const toItem = (r: Row): PenanceItem => ({
  id: r.id,
  profileId: r.profile_id,
  kind: r.kind,
  month: r.month,
  threshold: r.threshold,
  status: r.status,
  createdAt: r.created_at,
  doneAt: r.done_at,
  acknowledgedAt: r.acknowledged_at,
  text: r.custom_text ?? r.penance?.text ?? null,
  custom: r.custom,
  awaiting: r.custom && !r.custom_text,
});

/** Tutte le da fare + le ultime 50 fatte del gruppo (la RLS limita al proprio gruppo). */
export async function fetchPenances(supabase: SupabaseClient<Database>): Promise<PenanceItem[]> {
  const [todo, done] = await Promise.all([
    supabase.from("penance_assignments").select(SELECT).eq("status", "pending").order("created_at", { ascending: false }),
    supabase
      .from("penance_assignments")
      .select(SELECT)
      .eq("status", "done")
      .order("done_at", { ascending: false })
      .limit(50),
  ]);
  return [...((todo.data ?? []) as Row[]), ...((done.data ?? []) as Row[])].map(toItem);
}

export async function fetchPenance(supabase: SupabaseClient<Database>, id: string) {
  const { data } = await supabase.from("penance_assignments").select(SELECT).eq("id", id).maybeSingle();
  return data ? toItem(data as Row) : null;
}

export async function setPenanceStatus(supabase: SupabaseClient<Database>, id: string, status: "pending" | "done") {
  const { data, error } = await supabase
    .from("penance_assignments")
    .update({ status })
    .eq("id", id)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Solo admin (lo verifica il database). */
export async function decidePenance(supabase: SupabaseClient<Database>, id: string, text: string) {
  const { data, error } = await supabase
    .from("penance_assignments")
    .update({ custom_text: text.trim() })
    .eq("id", id)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export const AWAITING_TEXT = "Da decidere";

export async function acknowledgePenance(supabase: SupabaseClient<Database>, id: string) {
  await supabase.from("penance_assignments").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
}

/** "novembre" da "2026-11-01". */
export const monthName = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1].toLowerCase();

/** Riga sotto il testo della card, come nella board Penitenze. */
export function penanceMeta(p: PenanceItem, when: (iso: string) => string) {
  if (p.status === "done" && p.doneAt) {
    // "fatta oggi", "fatta ieri", "fatta il 2 nov"
    const w = when(p.doneAt);
    const on = w === "oggi" || w === "ieri" ? w : `il ${w}`;
    return p.kind === "monthly" ? `Bocca sporca di ${monthName(p.month)} · fatta ${on}` : `Fatta ${on}`;
  }
  return p.kind === "monthly"
    ? `Bocca sporca di ${monthName(p.month)}`
    : `Sbloccata a ${p.threshold} timbri · ${when(p.createdAt)}`;
}
