"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { fetchClosures, type Closure } from "@/lib/monthEnd";
import { decidePenance } from "@/lib/penances";
import { createClient } from "@/lib/supabase/client";
import { MonthEnd, type AvatarInfo } from "./MonthEnd";

/** Scrive il testo della grossa su tutte le assegnazioni del mese (pari merito) e ricarica la chiusura. */
export function useDecideMonthly(closure: Closure | null, onUpdated: (c: Closure) => void) {
  const supabase = useMemo(() => createClient(), []);
  return useCallback(
    async (text: string) => {
      if (!closure?.penance) return false;
      const results = await Promise.all(closure.penance.ids.map((id) => decidePenance(supabase, id, text)));
      if (!results.every(Boolean)) return false;
      const [fresh] = await fetchClosures(supabase, closure.month);
      if (fresh) onUpdated(fresh);
      return true;
    },
    [supabase, closure, onUpdated],
  );
}

/**
 * Mostra "Bocca sporca del mese" al primo accesso dopo la chiusura.
 * Alla chiusura segna `last_seen_closure` e porta al tabellone del mese nuovo.
 */
export function MonthEndGate({
  initial,
  meId,
  isAdmin,
  avatars,
}: {
  initial: Closure;
  meId: string;
  isAdmin: boolean;
  avatars: Record<string, AvatarInfo>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [closure, setClosure] = useState<Closure | null>(initial);
  const decide = useDecideMonthly(closure, setClosure);

  const close = useCallback(() => {
    if (!closure) return;
    supabase.from("profiles").update({ last_seen_closure: closure.month }).eq("id", meId).then(() => {});
    setClosure(null);
    router.push("/");
  }, [closure, supabase, meId, router]);

  if (!closure) return null;
  return <MonthEnd closure={closure} avatars={avatars} isAdmin={isAdmin} onClose={close} onDecide={decide} />;
}
