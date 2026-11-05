"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stamp, type StampIcon } from "@design/Stamp";
import { GirlAvatar } from "@/components/GirlAvatar";
import { InstallBanner } from "@/components/InstallBanner";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useOnline } from "@/hooks/useOnline";
import { cellKey, statusLine, totalsOf, uuid, type Counts, type Girl, type Word } from "@/lib/board";
import { monthInfo, shortDate } from "@/lib/month";
import { createClient } from "@/lib/supabase/client";
import { setPenanceStatus } from "@/lib/penances";
import { noteStamp } from "@/lib/stampBus";
import { BoardGrid, type Fresh } from "./BoardGrid";
import { CellSheet, QuickStampSheet } from "./Sheets";

export type PendingPenance = {
  id: string;
  profileId: string;
  kind: "small" | "monthly";
  createdAt: string;
  text: string;
  awaiting: boolean;
};

type Props = {
  me: { id: string; role: "admin" | "member" };
  group: { id: string; name: string; timezone: string };
  month: string;
  girls: Girl[];
  words: Word[];
  initialCounts: Counts;
  todo: PendingPenance[];
};

type StampRow = { id: string; profile_id: string; word_id: string; month: string; voided_at: string | null };

type Toast =
  | { kind: "stamp"; id: string; word: Word; girl: Girl; total: number; until: number }
  | { kind: "error"; message: string; until: number };

/** Il toast "Timbrato!" con Annulla resta 10 secondi. */
const UNDO_TOAST_MS = 10_000;

export function Board({ me, group, month, girls, words, initialCounts, todo: initialTodo }: Props) {
  const [todo, setTodo] = useState(initialTodo);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const online = useOnline();
  const desktop = useIsDesktop();

  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [fresh, setFresh] = useState<Fresh>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheet, setSheet] = useState<null | { type: "quick" } | { type: "cell"; girl: Girl; word: Word }>(null);

  // Id dei timbri già contati (ottimistici o arrivati via Realtime) e di quelli già scontati.
  const counted = useRef(new Set<string>());
  const discounted = useRef(new Set<string>());
  // Insert in volo: dopo un refetch vanno riaggiunti finché il server non li conferma.
  const inflight = useRef(new Map<string, string>());

  const meGirl = girls.find((g) => g.id === me.id)!;
  const totals = useMemo(() => totalsOf(girls, words, counts), [girls, words, counts]);
  const countsRef = useRef(counts);
  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);

  const leaders = useMemo(() => {
    const max = Math.max(0, ...totals);
    return new Set(max > 0 ? girls.filter((_, i) => totals[i] === max).map((g) => g.id) : []);
  }, [girls, totals]);

  const info = monthInfo(group.timezone);
  const status = statusLine(girls, totals, me.id);
  const myTotal = totals[girls.findIndex((g) => g.id === me.id)] ?? 0;

  const bump = useCallback((key: string, delta: number) => {
    setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + delta) }));
  }, []);

  const flash = useCallback((key: string) => setFresh({ key, nonce: Date.now() }), []);

  // ─────────────── Riallineamento col server ───────────────
  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("monthly_board")
      .select("profile_id, word_id, stamps")
      .eq("month", month);
    if (error || !data) return;
    const next: Counts = {};
    for (const r of data) if (r.profile_id && r.word_id) next[cellKey(r.profile_id, r.word_id)] = r.stamps ?? 0;
    for (const key of inflight.current.values()) next[key] = (next[key] ?? 0) + 1;
    setCounts(next);
  }, [supabase, month]);

  // ─────────────── Realtime ───────────────
  useEffect(() => {
    let dropped = false;
    const channel = supabase
      .channel(`stamps:${group.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stamps", filter: `group_id=eq.${group.id}` },
        ({ new: s }) => {
          const row = s as StampRow;
          if (row.month !== month || row.voided_at || counted.current.has(row.id)) return;
          counted.current.add(row.id);
          const key = cellKey(row.profile_id, row.word_id);
          bump(key, +1);
          flash(key);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stamps", filter: `group_id=eq.${group.id}` },
        ({ new: s }) => {
          const row = s as StampRow;
          if (row.month !== month || !row.voided_at || discounted.current.has(row.id)) return;
          discounted.current.add(row.id);
          bump(cellKey(row.profile_id, row.word_id), -1);
        },
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED" && dropped) refetch();
        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") dropped = true;
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, group.id, month, bump, flash, refetch]);

  // Al ritorno in primo piano o online: cambio mese → ricarica la pagina; altrimenti riallinea i conteggi.
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      if (monthInfo(group.timezone).month !== month) router.refresh();
      else refetch();
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
    };
  }, [group.timezone, month, refetch, router]);

  // ─────────────── Toast ───────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), Math.max(0, toast.until - Date.now()));
    return () => clearTimeout(t);
  }, [toast]);

  // ─────────────── Timbrare e annullare ───────────────
  const stamp = useCallback(
    async (girl: Girl, word: Word) => {
      if (!navigator.onLine) return;
      const id = uuid();
      const key = cellKey(girl.id, word.id);
      const gi = girls.findIndex((g) => g.id === girl.id);
      const total = totalsOf(girls, words, countsRef.current)[gi] + 1;

      counted.current.add(id);
      inflight.current.set(id, key);
      noteStamp(girl.id);
      bump(key, +1);
      flash(key);
      navigator.vibrate?.(15);
      setToast({ kind: "stamp", id, word, girl, total, until: Date.now() + UNDO_TOAST_MS });

      const { error } = await supabase
        .from("stamps")
        .insert({ id, group_id: group.id, profile_id: girl.id, word_id: word.id, created_by: me.id });
      inflight.current.delete(id);

      if (error) {
        counted.current.delete(id);
        bump(key, -1);
        setToast({ kind: "error", message: "Timbro non salvato: riprova.", until: Date.now() + 5000 });
      }
      // La penitenza (10, 20, 30…) la crea il database; la schermata arriva in Fase 4.
    },
    [girls, words, supabase, group.id, me.id, bump, flash],
  );

  const undo = useCallback(
    async (stampId: string, key?: string): Promise<boolean> => {
      // La chiave serve per lo sconto ottimistico; dal pannello cella la ricaviamo dopo.
      if (key) {
        discounted.current.add(stampId);
        bump(key, -1);
      }
      const { data, error } = await supabase
        .from("stamps")
        .update({ voided_at: new Date().toISOString() })
        .eq("id", stampId)
        .select("profile_id, word_id");
      const row = data?.[0];
      if (error || !row) {
        if (key) {
          discounted.current.delete(stampId);
          bump(key, +1);
        }
        return false;
      }
      if (!key && !discounted.current.has(stampId)) {
        discounted.current.add(stampId);
        bump(cellKey(row.profile_id, row.word_id), -1);
      }
      return true;
    },
    [supabase, bump],
  );

  const disabled = !online;
  const todoFor = (id: string) => girls.find((g) => g.id === id);

  return (
    <div className="flex h-dvh flex-col lg:h-auto lg:min-h-dvh lg:gap-6 lg:px-[clamp(16px,3vw,40px)] lg:pt-8 lg:pb-10">
      {/* ─────────────── Header ─────────────── */}
      <header className="flex flex-col gap-1.5 px-5 pt-[54px] lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-4 lg:p-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <Stamp icon="asterisco" size={28} rot={-12} />
              <span className="shrink-0 font-display text-base whitespace-nowrap text-red">Swear Jar</span>
              <span className="truncate text-xs text-muted">· {group.name}</span>
            </div>
            <DaysChip label={info.daysLabel} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5 lg:mt-0 lg:gap-3.5">
            <h1 className="font-display text-[40px] leading-[1.05] lg:text-5xl lg:leading-none">{info.label}</h1>
            <span className="font-display text-lg text-muted lg:text-2xl">{info.year}</span>
            <span className="hidden lg:flex">
              <DaysChip label={info.daysLabel} />
            </span>
          </div>
          <p className="text-[13px] leading-[1.35] text-muted lg:text-[15px]" aria-live="polite">
            {status}
          </p>
        </div>
        <div className="hidden lg:block">
          <Fab disabled={disabled} onClick={() => setSheet({ type: "quick" })} />
        </div>
      </header>

      {!online && <OfflineBanner />}
      <InstallBanner />

      {/* ─────────────── Tabellone ─────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:flex-wrap lg:items-start">
        <section
          aria-label="Tabellone del mese"
          className="mt-3.5 min-h-0 flex-1 overflow-auto pb-[188px] lg:mt-0 lg:flex-[999_1_620px] lg:overflow-x-auto lg:overflow-y-visible lg:rounded-cell lg:bg-card lg:pb-0 lg:shadow-[0_1px_0_var(--sj-line),0_10px_30px_rgb(var(--sj-shadow-rgb)/0.08)]"
        >
          <div className="lg:min-w-[660px]">
            <BoardGrid
              girls={girls}
              words={words}
              counts={counts}
              totals={totals}
              leaders={leaders}
              fresh={fresh}
              disabled={disabled}
              desktop={desktop}
              onTap={stamp}
              onDetails={(girl, word) => setSheet({ type: "cell", girl, word })}
            />
          </div>
        </section>

        {/* Penitenze da fare (solo desktop) */}
        <section aria-labelledby="sj-dtodo" className="hidden min-w-0 flex-[1_1_280px] flex-col gap-3 lg:flex">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sj-dtodo" className="font-display text-[22px]">
              Penitenze da fare
            </h2>
            <Link href="/penitenze" className="text-sm font-bold text-red underline underline-offset-[3px]">
              Tutte
            </Link>
          </div>
          {todo.length === 0 && <p className="text-sm text-muted">Nessuna penitenza in sospeso. Per ora.</p>}
          {todo.map((p) => {
            const who = todoFor(p.profileId);
            return (
              <article
                key={p.id}
                className="flex flex-col gap-2 rounded-md bg-card px-4 py-3.5 shadow-[0_1px_0_var(--sj-line),0_6px_16px_rgb(var(--sj-shadow-rgb)/0.06)]"
              >
                <div className="flex items-center gap-2">
                  {who && <GirlAvatar name={who.name} color={who.color} avatarUrl={who.avatarUrl} size={28} />}
                  <span className="text-sm font-extrabold">{who?.name ?? "—"}</span>
                  <span className="ml-auto text-xs text-muted">{shortDate(p.createdAt, group.timezone)}</span>
                </div>
                <p className={`font-display text-[17px] leading-[1.25] ${p.awaiting ? "text-muted" : ""}`}>{p.text}</p>
                {p.awaiting && me.role === "admin" && (
                  <Link href="/penitenze" className="self-start text-[13px] font-extrabold text-red underline underline-offset-2">
                    Decidila tu
                  </Link>
                )}
                {!p.awaiting && (p.profileId === me.id || me.role === "admin") && (
                  <button
                    type="button"
                    onClick={async () => {
                      setTodo((t) => t.filter((x) => x.id !== p.id));
                      if (!(await setPenanceStatus(supabase, p.id, "done"))) setTodo((t) => [p, ...t]);
                    }}
                    className="h-10 self-start rounded-[20px] border-[1.5px] border-ink px-3.5 text-[13px] font-extrabold text-ink"
                  >
                    Segna come fatta
                  </button>
                )}
              </article>
            );
          })}
        </section>
      </div>

      {/* ─────────────── Bottone flottante (mobile) ─────────────── */}
      {!(toast && !desktop) && (
        <div className="fixed bottom-[100px] left-1/2 z-20 -translate-x-1/2 lg:hidden">
          <Fab disabled={disabled} onClick={() => setSheet({ type: "quick" })} />
        </div>
      )}

      {toast &&
        createPortal(
          <ToastView
            key={toast.kind === "stamp" ? toast.id : toast.until}
            toast={toast}
            meId={me.id}
            offline={!online}
            onUndo={undo}
            onClose={() => setToast(null)}
          />,
          document.body,
        )}

      {sheet?.type === "quick" && (
        <QuickStampSheet
          me={meGirl}
          words={words}
          total={myTotal}
          onClose={() => setSheet(null)}
          onPick={(w) => {
            setSheet(null);
            stamp(meGirl, w);
          }}
        />
      )}
      {sheet?.type === "cell" && (
        <CellSheet
          girl={sheet.girl}
          word={sheet.word}
          girls={girls}
          me={me}
          month={month}
          timezone={group.timezone}
          onUndo={(id) => undo(id)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function DaysChip({ label }: { label: string }) {
  return (
    <div className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-chip border-[1.5px] border-ink px-3 text-xs font-bold whitespace-nowrap lg:h-8 lg:rounded-2xl lg:px-3.5 lg:text-[13px]">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 10h17" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div
      role="status"
      className="mx-4 mt-3 flex h-[38px] items-center gap-2 rounded-cell bg-card2 px-3 text-[13px] font-semibold text-ink lg:mx-0 lg:mt-0"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M8.5 8.6A4.5 4.5 0 0 0 6.5 17H17" />
        <path d="M12.4 6.2A5.5 5.5 0 0 1 18 11a3.5 3.5 0 0 1 2.4 5.3" />
      </svg>
      <span>Sei offline: puoi guardare, non timbrare.</span>
    </div>
  );
}

function Fab({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="flex h-14 cursor-not-allowed items-center gap-2.5 rounded-fab border-[1.5px] border-dashed border-line bg-card2 px-[22px] text-[15px] font-bold whitespace-nowrap text-muted"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9.5" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span>Timbri in pausa: sei offline</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center gap-2.5 rounded-fab bg-red pr-6 pl-[18px] text-base font-extrabold whitespace-nowrap text-on-red shadow-fab transition-transform active:translate-y-[3px] lg:h-[52px]"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.5 3h5a1 1 0 0 1 1 1v3.2a2 2 0 0 1-1 1.7V11h4a2 2 0 0 1 2 2v3H3.5v-3a2 2 0 0 1 2-2h4V8.9a2 2 0 0 1-1-1.7V4a1 1 0 0 1 1-1z" />
        <path d="M4 20h16" />
      </svg>
      <span>Ho detto una parolaccia</span>
    </button>
  );
}

function ToastView({
  toast,
  meId,
  offline,
  onUndo,
  onClose,
}: {
  toast: Toast;
  meId: string;
  offline: boolean;
  onUndo: (id: string, key?: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [late, setLate] = useState(false);

  const base =
    "fixed inset-x-4 bottom-[100px] z-30 flex min-h-[60px] items-center gap-3 overflow-hidden rounded-card bg-toast-bg py-2 pr-2 pl-3 text-toast-ink shadow-toast anim-toast lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px]";

  if (toast.kind === "error" || late) {
    return (
      <div role="alert" className={base}>
        <span className="flex-1 px-1 text-sm font-bold">{late ? "Troppo tardi per annullare." : (toast as { message: string }).message}</span>
        <button type="button" onClick={onClose} className="h-11 rounded-cell px-3 text-sm font-bold">
          Ok
        </button>
      </div>
    );
  }

  const isMe = toast.girl.id === meId;
  return (
    <div role="status" className={base}>
      <Stamp icon={toast.word.icon as StampIcon} color="var(--sj-toast-stamp)" size={34} rot={-8} blend="normal" />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <strong className="text-[15px] font-extrabold">Timbrato!</strong>
        <span className="truncate text-xs opacity-85">
          {toast.word.label} · {isMe ? "ora sei" : `${toast.girl.name} ora è`} a quota {toast.total}
        </span>
      </div>
      <button
        type="button"
        disabled={busy || offline}
        onClick={async () => {
          setBusy(true);
          const ok = await onUndo(toast.id, cellKey(toast.girl.id, toast.word.id));
          if (ok) onClose();
          else setLate(true);
          setBusy(false);
        }}
        className="h-11 shrink-0 rounded-cell border-[1.5px] border-toast-accent px-4 text-sm font-extrabold text-toast-accent disabled:opacity-50"
      >
        Annulla
      </button>
      {/* I 10 secondi per annullare */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[3px] bg-toast-accent"
        style={{ animation: `sj-countdown ${UNDO_TOAST_MS}ms linear forwards` }}
      />
    </div>
  );
}
