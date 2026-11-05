import { Suspense } from "react";
import { Stamp } from "@design/Stamp";
import type { GirlColor } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { PaperScreen } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "./(auth)/actions";

/** Segnaposto protetto: il tabellone arriva in Fase 3. */
export default function Home() {
  return (
    <PaperScreen className="gap-8 pt-[54px]">
      <header className="flex items-center gap-2">
        <Stamp icon="asterisco" size={28} rot={-12} />
        <span className="font-display text-base text-red">Swear Jar</span>
      </header>
      <Suspense fallback={<WhoSkeleton />}>
        <Who />
      </Suspense>
    </PaperScreen>
  );
}

async function Who() {
  const me = await getCurrentProfile();

  return (
    <>
      <div className="flex items-center gap-4">
        <GirlAvatar name={me.display_name} color={me.color as GirlColor} avatarUrl={me.avatar_url} size={64} leader={me.role === "admin"} />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] leading-none">Ciao, {me.display_name}</h1>
          <span className="text-sm text-muted">
            {me.group.name} · {me.role === "admin" ? "admin" : "member"}
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

      <p className="text-[15px] text-muted">Il tabellone arriva nella prossima fase.</p>

      <form action={logout}>
        <button
          type="submit"
          className="h-11 rounded-button border-[1.5px] border-ink px-[18px] text-sm font-extrabold text-ink"
        >
          Esci
        </button>
      </form>
    </>
  );
}

function WhoSkeleton() {
  return (
    <div className="flex items-center gap-4" aria-busy="true" aria-label="Caricamento">
      <div className="size-16 animate-pulse rounded-full bg-card2" />
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-card2" />
        <div className="h-3.5 w-24 animate-pulse rounded-md bg-card2" />
      </div>
    </div>
  );
}
