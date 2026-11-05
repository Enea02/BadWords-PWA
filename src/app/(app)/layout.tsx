import { Suspense } from "react";
import { PaperGrain } from "@design/PaperGrain";
import { Stamp } from "@design/Stamp";
import type { GirlColor } from "@design/girls";
import { BottomNav, SidebarNav } from "@/components/AppNav";
import { GirlAvatar } from "@/components/GirlAvatar";
import { MonthEndGate } from "@/components/MonthEndHost";
import { PenanceWatcher } from "@/components/PenanceWatcher";
import { fetchClosures } from "@/lib/monthEnd";
import { getCurrentProfile } from "@/lib/auth";
import { monthInfo } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";

/** Area protetta: barra in basso su mobile, barra laterale da 1024 px (board Desktop). */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh lg:flex">
      <PaperGrain className="fixed!" />

      <aside className="relative z-10 hidden w-[240px] shrink-0 flex-col gap-7 border-r-[1.5px] border-line bg-card px-5 py-7 lg:flex">
        <div className="flex items-center gap-2.5">
          <Stamp icon="asterisco" size={36} rot={-12} />
          <div className="flex flex-col">
            <span className="font-display text-xl leading-[1.1] text-red">Swear Jar</span>
            <Suspense fallback={<span className="h-4 w-20 rounded bg-card2" />}>
              <GroupName />
            </Suspense>
          </div>
        </div>
        <SidebarNav />
        <div className="flex-1" />
        <Suspense fallback={<div className="h-[58px] rounded-[12px] border-[1.5px] border-dashed border-line" />}>
          <MeCard />
        </Suspense>
      </aside>

      <div className="relative z-10 min-w-0 flex-1">{children}</div>
      <BottomNav />
      <Suspense fallback={null}>
        <Watcher />
      </Suspense>
      <Suspense fallback={null}>
        <ClosureGate />
      </Suspense>
    </div>
  );
}

async function Watcher() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name");
  return (
    <PenanceWatcher
      meId={me.id}
      isAdmin={me.role === "admin"}
      groupId={me.group.id}
      timezone={me.group.timezone}
      members={(data ?? []).map((p) => ({ id: p.id, name: p.display_name }))}
    />
  );
}

/** "Bocca sporca del mese" al primo accesso dopo la chiusura (solo per chi c'era in quel mese). */
async function ClosureGate() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("month_closures")
    .select("month")
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return null;

  const joined = monthInfo(me.group.timezone, new Date(me.created_at)).month;
  const unseen = !me.last_seen_closure || latest.month > me.last_seen_closure;
  if (!unseen || latest.month < joined) return null;

  const [[closure], { data: girls }] = await Promise.all([
    fetchClosures(supabase, latest.month),
    supabase.from("profiles").select("id, color, avatar_url"),
  ]);
  if (!closure) return null;
  const avatars = Object.fromEntries((girls ?? []).map((g) => [g.id, { avatarUrl: g.avatar_url, color: g.color as GirlColor }]));

  return <MonthEndGate initial={closure} meId={me.id} isAdmin={me.role === "admin"} avatars={avatars} />;
}

async function GroupName() {
  const me = await getCurrentProfile();
  return <span className="text-xs text-muted">{me.group.name}</span>;
}

async function MeCard() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_board")
    .select("stamps")
    .eq("profile_id", me.id)
    .eq("month", monthInfo(me.group.timezone).month);
  const total = (data ?? []).reduce((s, r) => s + (r.stamps ?? 0), 0);

  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border-[1.5px] border-dashed border-line p-2.5">
      <GirlAvatar name={me.display_name} color={me.color as GirlColor} avatarUrl={me.avatar_url} size={36} />
      <div className="flex flex-col">
        <span className="text-sm font-bold">{me.display_name}</span>
        <span className="text-xs text-muted">
          {me.role === "admin" ? "Admin" : "Membro"} · {total} {total === 1 ? "timbro" : "timbri"}
        </span>
      </div>
    </div>
  );
}
