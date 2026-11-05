"use client";

import { useState, useTransition } from "react";
import { setPenanceMode, type PenanceMode } from "./actions";

const OPTIONS: { id: PenanceMode; label: string; hint: string }[] = [
  { id: "deck", label: "Dal mazzo", hint: "Quando scatta, l'app ne pesca una a caso dal mazzo del gruppo." },
  { id: "custom", label: "Decise sul momento", hint: "Quando scatta, la scrive l'admin. Vale anche per la grossa di fine mese." },
];

/** Impostazione del gruppo: penitenze dal mazzo oppure decise dall'admin. */
export function PenanceModeToggle({ initial, isAdmin }: { initial: PenanceMode; isAdmin: boolean }) {
  const [mode, setMode] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!isAdmin) {
    const current = OPTIONS.find((o) => o.id === mode)!;
    return (
      <p className="text-sm text-muted">
        <strong className="text-ink">{current.label}.</strong> {current.hint} La sceglie l&apos;admin.
      </p>
    );
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0" disabled={pending}>
      <legend className="sr-only">Come si decidono le penitenze</legend>
      {OPTIONS.map((o) => {
        const on = o.id === mode;
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer items-start gap-3 rounded-card px-4 py-3.5 ${on ? "border-2 border-ink bg-card" : "border-[1.5px] border-line"}`}
          >
            <input
              type="radio"
              name="penance_mode"
              value={o.id}
              checked={on}
              onChange={() => {
                const prev = mode;
                setMode(o.id);
                setError(null);
                start(async () => {
                  const { ok } = await setPenanceMode(o.id);
                  if (!ok) {
                    setMode(prev);
                    setError("Impostazione non salvata: riprova.");
                  }
                });
              }}
              className="mt-0.5 size-5 shrink-0 accent-[var(--sj-red)]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">{o.label}</span>
              <span className="text-[13px] leading-[1.35] text-muted">{o.hint}</span>
            </span>
          </label>
        );
      })}
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">Il cambio vale per le penitenze che scattano da adesso in poi.</p>
    </fieldset>
  );
}
