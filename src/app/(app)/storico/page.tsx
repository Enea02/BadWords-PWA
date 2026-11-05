import { Suspense } from "react";
import type { GirlColor } from "@design/girls";
import { getCurrentProfile } from "@/lib/auth";
import { fetchClosures } from "@/lib/monthEnd";
import { createClient } from "@/lib/supabase/server";
import { HistoryList } from "./HistoryList";

/** Board "8 · Storico". */
export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryData />
    </Suspense>
  );
}

async function HistoryData() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const [closures, { data: girls }] = await Promise.all([
    fetchClosures(supabase),
    supabase.from("profiles").select("id, display_name, color, avatar_url").order("created_at"),
  ]);

  return (
    <HistoryList
      closures={closures}
      girls={(girls ?? []).map((g) => ({ id: g.id, name: g.display_name, color: g.color as GirlColor, avatarUrl: g.avatar_url }))}
      isAdmin={me.role === "admin"}
    />
  );
}

function HistorySkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-[18px] px-5 pt-[54px] lg:max-w-2xl lg:pt-10" aria-busy="true">
      <h1 className="font-display text-[34px] leading-[1.1]">Storico</h1>
      <div className="h-28 anim-pulse rounded-2xl bg-card2" />
      {[0, 1].map((i) => (
        <div key={i} className="h-40 anim-pulse rounded-md bg-card2" />
      ))}
    </main>
  );
}
