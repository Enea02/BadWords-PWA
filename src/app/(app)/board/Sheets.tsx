"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Stamp } from "@design/Stamp";
import { girlInk } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { progress, type Girl, type Word } from "@/lib/board";
import { stampTime } from "@/lib/month";
import { createClient } from "@/lib/supabase/client";

/** Bottom sheet modale (board TimbroRapido). Esc o tap sul velo per chiudere. */
export function Sheet({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, [href]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-center">
      <button type="button" aria-label="Chiudi" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-scrim anim-fade" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative flex max-h-[90dvh] w-full max-w-[430px] flex-col gap-4 overflow-y-auto rounded-t-[26px] bg-card px-5 pt-2.5 pb-[34px] shadow-[0_-12px_40px_rgb(28_20_16/0.25)] anim-sheet lg:rounded-[26px] lg:pb-6"
        style={{ paddingBottom: "max(34px, env(safe-area-inset-bottom))" }}
      >
        <div aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-line lg:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Rotazioni dei timbri nella griglia del timbro rapido (dalla board). */
const QUICK_ROT = [-8, 6, -4, 9, -10, 5];

const outline =
  "h-[50px] rounded-card border-[1.5px] border-ink bg-transparent text-[15px] font-bold text-ink";

/** "Ho detto una parolaccia": timbro per sé. */
export function QuickStampSheet({
  me,
  words,
  total,
  every,
  onPick,
  onClose,
}: {
  me: Girl;
  words: Word[];
  total: number;
  every: number;
  onPick: (w: Word) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const p = progress(total, every);

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center gap-3">
        <GirlAvatar name={me.name} color={me.color} avatarUrl={me.avatarUrl} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
            Cosa ti è scappato?
          </h2>
          <span className="text-[13px] text-muted">Timbro sul cartoncino di {me.name}</span>
        </div>
      </div>

      {p.hot && (
        <div role="note" className="flex items-center gap-2.5 rounded-[12px] bg-alert-bg px-3 py-2.5 text-[13px] leading-[1.35] font-semibold text-alert-ink">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M12 3.5 2.8 19.5h18.4z" />
            <path d="M12 10v4" />
            <path d="M12 17v.01" />
          </svg>
          <span>Sei a {total} timbri. Al prossimo scatta la penitenza.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {words.map((w, wi) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onPick(w)}
            className="flex h-[108px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line bg-paper text-sm font-bold text-ink active:scale-[0.97]"
          >
            <Stamp icon={w.icon} color={girlInk(me.color)} size={48} rot={QUICK_ROT[wi % QUICK_ROT.length]} />
            <span>{w.label}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onClose} className={outline}>
        Annulla, falso allarme
      </button>
    </Sheet>
  );
}

type StampRow = { id: string; created_at: string; created_by: string | null };

const UNDO_MS = 5 * 60 * 1000;

/** Pressione lunga su una cella: i timbri del mese, con "Annulla" dove è permesso. */
export function CellSheet({
  girl,
  word,
  girls,
  me,
  month,
  timezone,
  onUndo,
  onClose,
}: {
  girl: Girl;
  word: Word;
  girls: Girl[];
  me: { id: string; role: "admin" | "member" };
  month: string;
  timezone: string;
  onUndo: (stampId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [rows, setRows] = useState<StampRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    createClient()
      .from("stamps")
      .select("id, created_at, created_by")
      .eq("profile_id", girl.id)
      .eq("word_id", word.id)
      .eq("month", month)
      .is("voided_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setRows(data ?? []));
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [girl.id, word.id, month]);

  const nameOf = (id: string | null) =>
    id === me.id ? "te" : (girls.find((g) => g.id === id)?.name ?? "un'ex del gruppo");

  const canUndo = (r: StampRow) =>
    me.role === "admin" || (r.created_by === me.id && now - new Date(r.created_at).getTime() < UNDO_MS);

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center gap-3">
        <Stamp icon={word.icon} color={girlInk(girl.color)} size={44} rot={-6} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
            {word.label}
          </h2>
          <span className="text-[13px] text-muted">
            Cartoncino di {girl.id === me.id ? "te" : girl.name} · questo mese
          </span>
        </div>
      </div>

      {rows === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 anim-pulse rounded-[12px] bg-card2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Nessun timbro su questa cella, per ora.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-dashed divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex min-h-12 items-center justify-between gap-3 py-1.5">
              <span className="text-sm">
                Messo da <strong>{nameOf(r.created_by)}</strong>
                <span className="block text-xs text-muted">{stampTime(r.created_at, timezone, new Date(now))}</span>
              </span>
              {canUndo(r) && (
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={async () => {
                    setBusy(r.id);
                    setError(null);
                    const ok = await onUndo(r.id);
                    setBusy(null);
                    if (ok) setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
                    else setError("Non si può più annullare questo timbro.");
                  }}
                  className="h-11 shrink-0 rounded-button border-[1.5px] border-red px-4 text-sm font-extrabold text-red disabled:opacity-50"
                >
                  Annulla
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      {me.role !== "admin" && rows && rows.length > 0 && (
        <p className="text-xs text-muted">Puoi annullare i tuoi timbri entro 5 minuti. Dopo, solo l&apos;admin.</p>
      )}

      <button type="button" onClick={onClose} className={outline}>
        Chiudi
      </button>
    </Sheet>
  );
}
