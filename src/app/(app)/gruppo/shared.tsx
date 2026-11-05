"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Sheet } from "../board/Sheets";

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="font-display text-xl">
          {title}
        </h2>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export const dashedButton =
  "flex h-[52px] items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-ink text-[15px] font-extrabold text-ink";

export const listBox = "m-0 list-none overflow-hidden rounded-card border-[1.5px] border-line bg-card p-0";

export const iconButton =
  "flex size-11 shrink-0 items-center justify-center rounded-cell text-ink hover:bg-card2 focus-visible:outline-2 focus-visible:outline-red";

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M10 7V4.5h4V7" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

/** Pannello di conferma per le azioni che non si annullano. */
export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<string | void>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.4] text-muted">{body}</div>
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const err = await onConfirm();
          setBusy(false);
          if (err) setError(err);
          else onClose();
        }}
        className={`h-[50px] rounded-card text-[15px] font-extrabold disabled:opacity-60 ${danger ? "bg-red text-on-red" : "bg-ink text-paper"}`}
      >
        {busy ? "Un attimo…" : confirmLabel}
      </button>
      <button type="button" onClick={onClose} className="h-[50px] rounded-card border-[1.5px] border-ink text-[15px] font-bold text-ink">
        Annulla
      </button>
    </Sheet>
  );
}

/** Messaggio di stato che sparisce da solo. */
export function useFlash(ms = 4000) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), ms);
    return () => clearTimeout(t);
  }, [msg, ms]);
  return [msg, setMsg] as const;
}

export function Flash({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="status" className="text-sm font-bold text-ink">
      {msg}
    </p>
  );
}
