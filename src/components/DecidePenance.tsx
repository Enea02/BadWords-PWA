"use client";

import { useId, useState } from "react";

/** L'admin scrive la penitenza "sul momento". Usato nel biglietto della schermata e nelle card. */
export function DecidePenance({
  onDecide,
  label = "Decidi tu la penitenza",
  initial = "",
  autoFocus = false,
}: {
  onDecide: (text: string) => Promise<boolean>;
  label?: string;
  initial?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = text.trim();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!clean) return;
        setBusy(true);
        setError(null);
        const ok = await onDecide(clean);
        setBusy(false);
        if (!ok) setError("Non salvata: riprova.");
      }}
    >
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        rows={2}
        autoFocus={autoFocus}
        placeholder="es. Per 24 ore parli solo in rima."
        className="min-h-[72px] resize-none rounded-cell border-[1.5px] border-ink bg-paper px-3 py-2.5 font-display text-lg leading-[1.2] text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted focus-visible:ring-2 focus-visible:ring-red"
      />
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !clean}
        className="h-11 rounded-[22px] bg-red text-[15px] font-extrabold text-on-red disabled:opacity-50"
      >
        {busy ? "Timbro…" : "Timbra la penitenza"}
      </button>
    </form>
  );
}
