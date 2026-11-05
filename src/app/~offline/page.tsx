import type { Metadata } from "next";
import { Stamp } from "@design/Stamp";
import { PaperScreen } from "@/components/ui";
import { ReloadButton } from "./ReloadButton";

export const metadata: Metadata = { title: "Offline · Swear Jar" };

/** Fallback del service worker per le pagine mai aperte prima (precaricata). */
export default function OfflinePage() {
  return (
    <PaperScreen className="items-center justify-center gap-5 text-center">
      <Stamp icon="nuvola" color="var(--sj-muted)" size={96} rot={-8} />
      <h1 className="font-display text-[34px] leading-[1.05]">Sei offline</h1>
      <p className="max-w-[300px] text-base leading-[1.45] text-pretty text-muted">
        Questa pagina non l&apos;avevi ancora aperta. Il tabellone che hai già visto resta consultabile; i timbri ripartono
        quando torna la rete.
      </p>
      <ReloadButton />
    </PaperScreen>
  );
}
