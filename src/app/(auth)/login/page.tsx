import type { Metadata } from "next";
import { LogoStamp } from "@/components/LogoStamp";
import { PaperScreen, TextLink } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entra · Swear Jar" };

/** Board "1 · Login", con nome utente e password al posto del magic link. */
export default function LoginPage() {
  return (
    <PaperScreen className="gap-[18px] pt-24">
      <LogoStamp />

      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="font-display text-[44px] leading-none">Swear Jar</h1>
        <p className="max-w-[300px] text-base leading-[1.45] text-pretty text-muted">
          La carta fedeltà al contrario. Ogni parolaccia è un timbro, ogni dieci timbri una penitenza.
        </p>
      </div>

      <div className="flex-1" />

      <LoginForm />
      <TextLink href="/registrati">Prima volta? Ho un codice invito</TextLink>
    </PaperScreen>
  );
}
