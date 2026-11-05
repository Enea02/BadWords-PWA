import { Suspense } from "react";
import type { GirlColor } from "@design/girls";
import { getCurrentProfile } from "@/lib/auth";
import { isRecent } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../../(auth)/actions";
import { DeckEditor, type PenanceRow } from "./DeckEditor";
import { Account, InviteCode } from "./InviteAndAccount";
import { LegendEditor, type WordRow } from "./LegendEditor";
import { Members } from "./Members";
import { PenanceModeToggle } from "./PenanceModeToggle";

/** Board "9 · Impostazioni admin". Le member vedono membri, regole in sola lettura e il proprio account. */
export default function GroupPage() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-8 px-5 pt-[54px] pb-32 lg:max-w-2xl lg:pt-10 lg:pb-12">
      <Suspense fallback={<GroupSkeleton />}>
        <GroupData />
      </Suspense>
    </main>
  );
}

async function GroupData() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const isAdmin = me.role === "admin";

  const [{ data: profiles }, { data: words }, { data: penances }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, color, avatar_url, role, created_at").order("created_at"),
    isAdmin
      ? supabase.from("words").select("id, label, icon, sort_order, active").order("sort_order").order("created_at")
      : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from("penances").select("id, kind, text").eq("active", true).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.display_name,
    color: p.color as GirlColor,
    avatarUrl: p.avatar_url,
    role: p.role,
    recent: isRecent(p.created_at, 7),
  }));

  return (
    <>
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-[34px] leading-[1.1]">Gruppo</h1>
        <span className="text-[13px] text-muted">
          {me.group.name} · {isAdmin ? "sei l'admin" : `ti chiamano ${me.display_name}`}
        </span>
      </header>

      {isAdmin ? (
        <>
          <LegendEditor groupId={me.group.id} initial={(words ?? []) as WordRow[]} />
          <DeckEditor
            groupId={me.group.id}
            mode={me.group.penance_mode}
            every={me.group.penance_every}
            initial={(penances ?? []) as PenanceRow[]}
          />
          <Members meId={me.id} isAdmin initial={members} />
          <InviteCode initial={me.group.invite_code} groupName={me.group.name} />
        </>
      ) : (
        <>
          <Members meId={me.id} isAdmin={false} initial={members} />
          <section aria-labelledby="sj-rules" className="flex flex-col gap-2.5">
            <h2 id="sj-rules" className="font-display text-xl">
              Regole del gruppo
            </h2>
            <p className="text-sm text-muted">
              <strong className="text-ink">Una penitenza piccola ogni {me.group.penance_every} timbri</strong>, la grossa alla
              bocca sporca del mese.
            </p>
            <PenanceModeToggle initial={me.group.penance_mode} isAdmin={false} />
          </section>
        </>
      )}

      <Account logout={logout} />
    </>
  );
}

function GroupSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <h1 className="font-display text-[34px] leading-[1.1]">Gruppo</h1>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 anim-pulse rounded-card bg-card2" />
      ))}
    </div>
  );
}
