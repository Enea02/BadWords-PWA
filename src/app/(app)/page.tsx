import { Suspense } from "react";
import type { StampIcon } from "@design/Stamp";
import type { GirlColor } from "@design/girls";
import { getCurrentProfile } from "@/lib/auth";
import { cellKey, type Counts, type Girl, type Word } from "@/lib/board";
import { monthInfo } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import { Board, type PendingPenance } from "./board/Board";
import { BoardSkeleton } from "./board/BoardSkeleton";

/** Board "3 · Tabellone" (mobile) e "Tabellone desktop". */
export default function BoardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardData />
    </Suspense>
  );
}

async function BoardData() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const m = monthInfo(me.group.timezone);

  const [girlsRes, wordsRes, countsRes, todoRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, color, avatar_url, role").order("created_at"),
    supabase.from("words").select("id, label, icon").eq("active", true).order("sort_order").order("created_at"),
    supabase.from("monthly_board").select("profile_id, word_id, stamps").eq("month", m.month),
    supabase
      .from("penance_assignments")
      .select("id, profile_id, kind, created_at, custom, custom_text, penance:penances (text)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const girls: Girl[] = (girlsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color as GirlColor,
    avatarUrl: p.avatar_url,
    role: p.role,
  }));
  const words: Word[] = (wordsRes.data ?? []).map((w) => ({ id: w.id, label: w.label, icon: w.icon as StampIcon }));
  const counts: Counts = {};
  for (const r of countsRes.data ?? []) {
    if (r.profile_id && r.word_id) counts[cellKey(r.profile_id, r.word_id)] = r.stamps ?? 0;
  }
  const todo: PendingPenance[] = (todoRes.data ?? []).map((a) => ({
    id: a.id,
    profileId: a.profile_id,
    kind: a.kind,
    createdAt: a.created_at,
    text: a.custom_text ?? a.penance?.text ?? (a.custom ? "Da decidere" : "Penitenza a scelta del gruppo"),
    awaiting: a.custom && !a.custom_text,
  }));

  return (
    <Board
      me={{ id: me.id, role: me.role }}
      group={{ id: me.group.id, name: me.group.name, timezone: me.group.timezone, penanceEvery: me.group.penance_every }}
      month={m.month}
      girls={girls}
      words={words}
      initialCounts={counts}
      todo={todo}
    />
  );
}
