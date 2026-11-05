"use client";

import { useMemo, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/username";
import { LogoutButton } from "./LogoutButton";
import { ConfirmSheet, Flash, Section, useFlash } from "./shared";

/** Board Admin · Codice invito: copia, condividi, rigenera. */
export function InviteCode({ initial, groupName }: { initial: string; groupName: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useFlash();

  const message = () =>
    `Entra in ${groupName} su Swear Jar: apri ${location.origin}/registrati e scrivi il codice ${code}`;

  return (
    <Section id="sj-inv" title="Codice invito" hint="Chi ce l'ha entra nel gruppo e nel tabellone.">
      <div
        className="flex h-[84px] items-center justify-center rounded-2xl border-2 border-dashed border-red bg-card font-display text-[38px] tracking-[0.18em] text-red select-all"
        aria-label={`Codice invito: ${code.split("").join(" ")}`}
      >
        {code}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setMsg("Codice copiato.");
          }}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[25px] bg-red text-[15px] font-extrabold text-on-red shadow-[0_3px_0_var(--sj-red-shadow)]"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
          </svg>
          <span>Copia</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ text: message() });
              else {
                await navigator.clipboard.writeText(message());
                setMsg("Messaggio copiato: incollalo nel gruppo.");
              }
            } catch {
              /* condivisione annullata */
            }
          }}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[25px] border-[1.5px] border-ink text-[15px] font-extrabold text-ink"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V4" />
            <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
            <path d="M5 13v6h14v-6" />
          </svg>
          <span>Condividi</span>
        </button>
      </div>
      <Flash msg={msg} />
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="min-h-11 self-center px-3 text-[15px] font-extrabold text-red underline underline-offset-[3px]"
      >
        Rigenera codice
      </button>
      <span className="-mt-2 self-center text-xs text-muted">Il codice attuale smetterà di funzionare.</span>

      {confirm && (
        <ConfirmSheet
          title="Rigenerare il codice?"
          body={<>Il codice {code} smetterà di funzionare. Chi è già nel gruppo resta dentro.</>}
          confirmLabel="Rigenera"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            const { data, error } = await supabase.rpc("regenerate_invite_code");
            if (error || !data) return "Non riuscito: riprova.";
            setCode(data);
            setMsg("Nuovo codice pronto.");
          }}
        />
      )}
    </Section>
  );
}

/** Per tutte: cambia password ed esci. */
export function Account({ logout }: { logout: () => Promise<void> }) {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useFlash();

  return (
    <Section id="sj-account" title="Il tuo account">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const err = validatePassword(password);
          if (err) return setError(err);
          setBusy(true);
          setError(null);
          const { error: upErr } = await supabase.auth.updateUser({ password });
          setBusy(false);
          if (upErr) setError(upErr.code === "same_password" ? "È uguale a quella di prima." : "Password non cambiata: riprova.");
          else {
            setPassword("");
            setMsg("Password cambiata.");
          }
        }}
      >
        <PasswordField
          id="sj-change-password"
          label="Nuova password"
          hint="Almeno 8 caratteri."
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm font-bold text-red">
            {error}
          </p>
        )}
        <Flash msg={msg} />
        <button
          type="submit"
          disabled={busy || !password}
          className="h-11 self-start rounded-button border-[1.5px] border-ink px-[18px] text-sm font-extrabold text-ink disabled:opacity-40"
        >
          {busy ? "Salvo…" : "Cambia password"}
        </button>
      </form>
      <div className="mt-2">
        <LogoutButton action={logout} />
      </div>
    </Section>
  );
}
