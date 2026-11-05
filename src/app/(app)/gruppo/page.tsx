import { Suspense } from "react";
import type { GirlColor } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "../../(auth)/actions";

/** Segnaposto di "Gruppo": il pannello admin completo arriva in Fase 7. */
export default function GroupPage() {
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-8 px-5 pt-[54px] pb-32 lg:max-w-2xl lg:pt-10">
      <h1 className="font-display text-[40px] leading-[1.05]">Gruppo</h1>
      <Suspense fallback={<div className="h-16 w-full anim-pulse rounded-card bg-card2" />}>
        <Who />
      </Suspense>
    </main>
  );
}

async function Who() {
  const me = await getCurrentProfile();

  return (
    <>
      <div className="flex items-center gap-4">
        <GirlAvatar name={me.display_name} color={me.color as GirlColor} avatarUrl={me.avatar_url} size={64} leader={me.role === "admin"} />
        <div className="flex flex-col gap-1">
          <span className="font-display text-[28px] leading-none">{me.display_name}</span>
          <span className="text-sm text-muted">
            {me.group.name} · {me.role === "admin" ? "admin" : "membro"}
          </span>
        </div>
      </div>

      {me.role === "admin" && (
        <div className="flex flex-col gap-1 rounded-card border-[1.5px] border-dashed border-line px-4 py-3.5">
          <span className="receipt text-xs text-muted">Codice invito</span>
          <span className="font-display text-[28px] tracking-[0.12em]">{me.group.invite_code}</span>
          <span className="text-[13px] text-muted">Mandalo alle amiche: lo scrivono in &ldquo;Ho un codice invito&rdquo;.</span>
        </div>
      )}

      <p className="text-[15px] text-muted">Legenda, mazzo delle penitenze e membri arrivano nel pannello admin.</p>

      <form action={logout}>
        <button type="submit" className="h-11 rounded-button border-[1.5px] border-ink px-[18px] text-sm font-extrabold text-ink">
          Esci
        </button>
      </form>
    </>
  );
}
