import type { Metadata } from "next";
import Image from "next/image";
import { PaperScreen, TextLink } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entra · Bad Words" };

/** Board "1 · Login", con nome utente e password al posto del magic link. */
export default function LoginPage() {
  return (
    <PaperScreen className="gap-[18px] pt-20">
      <Image
        src="/logo.png"
        alt="Bad Words: il dinosauro che si tappa la bocca"
        width={220}
        height={220}
        priority
        className="size-[200px] self-center"
      />

      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="font-display text-[44px] leading-none">Bad Words</h1>
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
