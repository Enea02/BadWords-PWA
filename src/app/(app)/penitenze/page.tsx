import { Suspense } from "react";
import type { GirlColor } from "@design/girls";
import { getCurrentProfile } from "@/lib/auth";
import type { Girl } from "@/lib/board";
import { monthInfo } from "@/lib/month";
import { fetchPenances } from "@/lib/penances";
import { createClient } from "@/lib/supabase/server";
import { PenanceList } from "./PenanceList";

/** Board "6 · Penitenze". */
export default function PenancesPage() {
  return (
    <Suspense fallback={<PenancesSkeleton />}>
      <PenancesData />
    </Suspense>
  );
}

async function PenancesData() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const [items, girlsRes] = await Promise.all([
    fetchPenances(supabase),
    supabase.from("profiles").select("id, display_name, color, avatar_url, role").order("created_at"),
  ]);
  const girls: Girl[] = (girlsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color as GirlColor,
    avatarUrl: p.avatar_url,
    role: p.role,
  }));

  return (
    <PenanceList
      me={{ id: me.id, role: me.role }}
      groupId={me.group.id}
      timezone={me.group.timezone}
      monthLabel={monthInfo(me.group.timezone).label}
      girls={girls}
      initial={items}
    />
  );
}

function PenancesSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-3.5 px-5 pt-[54px] lg:max-w-2xl lg:pt-10" aria-busy="true">
      <h1 className="font-display text-[34px] leading-[1.1]">Penitenze</h1>
      <div className="h-[52px] anim-pulse rounded-2xl bg-card2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 anim-pulse rounded-md bg-card2" />
      ))}
    </main>
  );
}
