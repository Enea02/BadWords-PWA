"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stamp } from "@design/Stamp";
import { GirlAvatar } from "@/components/GirlAvatar";
import type { Girl } from "@/lib/board";
import { relativeDay, shortDate } from "@/lib/month";
import { FALLBACK_TEXT, fetchPenances, penanceMeta, setPenanceStatus, type PenanceItem } from "@/lib/penances";
import { createClient } from "@/lib/supabase/client";

type Tab = "todo" | "done";
type Scope = "tutte" | "mie";

const UNDO_MS = 10_000;

export function PenanceList({
  me,
  groupId,
  timezone,
  monthLabel,
  girls,
  initial,
}: {
  me: { id: string; role: "admin" | "member" };
  groupId: string;
  timezone: string;
  monthLabel: string;
  girls: Girl[];
  initial: PenanceItem[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<Tab>("todo");
  const [scope, setScope] = useState<Scope>("tutte");
  const [undo, setUndo] = useState<{ id: string; until: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freshDone, setFreshDone] = useState<string | null>(null);
  // Modifiche locali in volo: il refetch non deve annullarle visivamente.
  const local = useRef(new Map<string, PenanceItem["status"]>());

  const refetch = useCallback(async () => {
    const next = await fetchPenances(supabase);
    setItems(next.map((p) => (local.current.has(p.id) ? { ...p, status: local.current.get(p.id)! } : p)));
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`penance-list:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "penance_assignments", filter: `group_id=eq.${groupId}` },
        () => refetch(),
      )
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && refetch();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, groupId, refetch]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), Math.max(0, undo.until - Date.now()));
    return () => clearTimeout(t);
  }, [undo]);

  const setStatus = async (p: PenanceItem, status: PenanceItem["status"]) => {
    setError(null);
    local.current.set(p.id, status);
    const doneAt = status === "done" ? new Date().toISOString() : null;
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, status, doneAt } : x)));
    const ok = await setPenanceStatus(supabase, p.id, status);
    local.current.delete(p.id);
    if (!ok) {
      setItems((xs) => xs.map((x) => (x.id === p.id ? p : x)));
      setError("Modifica non salvata: riprova.");
      return false;
    }
    return true;
  };

  const girl = (id: string) => girls.find((g) => g.id === id);
  const inScope = items.filter((p) => scope === "tutte" || p.profileId === me.id);
  const todo = inScope.filter((p) => p.status === "pending");
  const done = inScope
    .filter((p) => p.status === "done")
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  const list = tab === "todo" ? todo : done;
  const pendingAll = items.filter((p) => p.status === "pending").length;
  const when = (iso: string) => {
    const r = relativeDay(iso, timezone);
    return r === "oggi" || r === "ieri" ? r : shortDate(iso, timezone);
  };

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col pb-32 lg:max-w-2xl lg:pb-10">
      <header className="flex flex-col gap-3.5 px-5 pt-[54px] pb-3 lg:pt-10">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[34px] leading-[1.1]">Penitenze</h1>
          <span className="text-[13px] text-muted">
            {monthLabel} · {pendingAll === 0 ? "niente da scontare" : `${pendingAll} da scontare`}
          </span>
        </div>

        <div role="tablist" aria-label="Stato" className="grid grid-cols-2 gap-1 rounded-2xl bg-card2 p-1">
          {(
            [
              ["todo", "Da fare", todo.length],
              ["done", "Fatte", done.length],
            ] as const
          ).map(([id, label, count]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(id)}
                className={`flex h-11 items-center justify-center gap-2 rounded-[12px] text-[15px] text-ink ${on ? "bg-card font-extrabold shadow-[0_1px_2px_rgb(var(--sj-shadow-rgb)/0.18)]" : "font-semibold"}`}
              >
                <span>{label}</span>
                <span
                  className={`h-[22px] min-w-[22px] rounded-full px-1.5 text-xs leading-[22px] font-extrabold ${on ? "bg-red text-on-red" : "bg-line text-ink"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          {(
            [
              ["tutte", "Tutte"],
              ["mie", "Solo mie"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
              className={`h-11 rounded-full border-[1.5px] border-ink px-3.5 text-[13px] font-bold ${scope === id ? "bg-ink text-paper" : "text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div role="tabpanel" className="flex flex-col gap-3.5 px-5 pt-1">
        {error && (
          <p role="alert" className="text-sm font-bold text-red">
            {error}
          </p>
        )}

        {list.map((p) => {
          const who = girl(p.profileId);
          const mine = p.profileId === me.id;
          const canMark = mine || me.role === "admin";
          const isDone = p.status === "done";
          return (
            <article
              key={p.id}
              className="relative shrink-0 rounded-md bg-card shadow-[0_1px_0_var(--sj-line),0_6px_16px_rgb(var(--sj-shadow-rgb)/0.08)]"
            >
              <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3.5">
                <div className="flex items-center gap-2.5">
                  {who && <GirlAvatar name={who.name} color={who.color} avatarUrl={who.avatarUrl} size={32} />}
                  <span className="text-[15px] font-extrabold">{who?.name ?? "Un'ex del gruppo"}</span>
                  {mine && (
                    <span className="h-5 rounded-full bg-ink px-2 text-[11px] leading-5 font-extrabold text-paper">tu</span>
                  )}
                  <span className={`receipt ml-auto text-xs tracking-[0.1em] ${p.kind === "monthly" ? "text-red" : "text-muted"}`}>
                    {p.kind === "monthly" ? "Grossa" : "Piccola"}
                  </span>
                </div>
                <p className={`font-display text-xl leading-[1.2] text-pretty ${isDone ? "text-muted" : "text-ink"}`}>
                  {p.text ?? FALLBACK_TEXT}
                </p>
                <span className="text-xs text-muted">{freshDone === p.id ? "Fatta adesso" : penanceMeta(p, when)}</span>
              </div>

              {!isDone && canMark && (
                <>
                  <div className="mx-3 border-t-2 border-dashed border-line" />
                  <div aria-hidden="true" className="absolute bottom-[57px] -left-[9px] size-[18px] rounded-full bg-paper" />
                  <div aria-hidden="true" className="absolute -right-[9px] bottom-[57px] size-[18px] rounded-full bg-paper" />
                  <div className="px-3 pt-2.5 pb-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (await setStatus(p, "done")) {
                          setFreshDone(p.id);
                          setUndo({ id: p.id, until: Date.now() + UNDO_MS });
                        }
                      }}
                      className={`flex h-11 w-full items-center justify-center gap-2 rounded-[22px] text-[15px] font-extrabold ${mine ? "bg-red text-on-red" : "border-[1.5px] border-ink text-ink"}`}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      <span>Segna come fatta</span>
                    </button>
                  </div>
                </>
              )}

              {isDone && <DoneStamp />}
            </article>
          );
        })}

        {list.length === 0 && (
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line px-4 py-10 text-center">
            <Stamp icon="asterisco" color="var(--sj-muted)" size={48} rot={-8} />
            <span className="font-display text-lg">{tab === "todo" ? "Niente da scontare" : "Ancora niente di fatto"}</span>
            <span className="text-sm text-muted">
              {tab === "todo" ? "Fedina pulita. Si fa per dire." : "Le penitenze scontate finiscono qui, col timbro."}
            </span>
          </div>
        )}
      </div>

      {undo &&
        createPortal(
          <div
            role="status"
            className="fixed inset-x-4 bottom-[100px] z-30 flex min-h-[60px] items-center gap-3 overflow-hidden rounded-card bg-toast-bg py-2 pr-2 pl-4 text-toast-ink shadow-toast anim-toast lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
          >
            <strong className="flex-1 text-[15px] font-extrabold">Segnata come fatta</strong>
            <button
              type="button"
              onClick={async () => {
                const p = items.find((x) => x.id === undo.id);
                setUndo(null);
                setFreshDone(null);
                if (p) await setStatus({ ...p, status: "done" }, "pending");
              }}
              className="h-11 shrink-0 rounded-cell border-[1.5px] border-toast-accent px-4 text-sm font-extrabold text-toast-accent"
            >
              Annulla
            </button>
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-[3px] bg-toast-accent"
              style={{ animation: `sj-countdown ${UNDO_MS}ms linear forwards` }}
            />
          </div>,
          document.body,
        )}
    </main>
  );
}

/** Timbro "FATTA" (board Penitenze). */
function DoneStamp() {
  return (
    <svg
      viewBox="0 0 120 48"
      width="104"
      height="42"
      role="img"
      aria-label="Fatta"
      className="absolute right-3.5 bottom-3 -rotate-10 text-done-ink"
      style={{ mixBlendMode: "var(--sj-stamp-blend)" as React.CSSProperties["mixBlendMode"] }}
    >
      <rect x="2" y="2" width="116" height="44" rx="8" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <rect x="8" y="8" width="104" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="60" y="33" textAnchor="middle" className="font-display" fontSize="22" letterSpacing="2" fill="currentColor">
        FATTA
      </text>
    </svg>
  );
}
