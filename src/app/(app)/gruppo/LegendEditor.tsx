"use client";

import { useId, useMemo, useRef, useState } from "react";
import { STAMP_ICONS, Stamp, type StampIcon } from "@design/Stamp";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "../board/Sheets";
import { Flash, PencilIcon, PlusIcon, Section, dashedButton, iconButton, listBox, useFlash } from "./shared";

export type WordRow = { id: string; label: string; icon: StampIcon; sort_order: number; active: boolean };

const ROW_H = 60;

const ICON_LABEL: Record<StampIcon, string> = {
  peperoncino: "Peperoncino",
  aeroplano: "Aeroplano",
  nuvola: "Nuvola",
  bomba: "Bomba",
  fulmine: "Fulmine",
  asterisco: "Asterisco",
};

/** Board Admin · Legenda: trascina per riordinare, matita per modificare, aggiungi voce. */
export function LegendEditor({ groupId, initial }: { groupId: string; initial: WordRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [words, setWords] = useState(() => [...initial].sort((a, b) => a.sort_order - b.sort_order));
  const [editing, setEditing] = useState<WordRow | "new" | null>(null);
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  const dragStart = useRef<{ y: number; before: string[] } | null>(null);
  const [msg, setMsg] = useFlash();

  // sort_order salvato sul database, per aggiornare solo le righe che cambiano posto.
  const saved = useRef(new Map(initial.map((w) => [w.id, w.sort_order])));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= words.length || from === to) return words;
    const next = [...words];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  /** Salva sort_order = posizione (1, 2, 3…) per le righe che hanno cambiato posto. */
  const commitOrder = async (next: WordRow[]) => {
    const updates = next.map((w, i) => ({ id: w.id, sort: i + 1 })).filter((u) => saved.current.get(u.id) !== u.sort);
    const results = await Promise.all(
      updates.map((u) => supabase.from("words").update({ sort_order: u.sort }).eq("id", u.id)),
    );
    const failed = results.some((r) => r.error);
    if (!failed) updates.forEach((u) => saved.current.set(u.id, u.sort));
    setWords(next.map((w, i) => ({ ...w, sort_order: i + 1 })));
    setMsg(failed ? "Ordine non salvato: riprova." : "Ordine salvato.");
  };

  return (
    <Section id="sj-leg" title="Legenda" hint="Trascina per riordinare: è l'ordine delle righe del tabellone.">
      <ul className={listBox}>
        {words.map((w, i) => {
          const dragging = drag?.id === w.id;
          return (
            <li
              key={w.id}
              className={`relative flex items-center gap-2.5 bg-card pr-1.5 pl-0.5 ${i ? "border-t border-dashed border-line" : ""} ${dragging ? "z-10 shadow-[0_8px_20px_rgb(var(--sj-shadow-rgb)/0.25)]" : ""}`}
              style={{ height: ROW_H, transform: dragging ? `translateY(${drag.dy}px)` : undefined }}
            >
              <button
                type="button"
                aria-label={`Riordina ${w.label}: usa le frecce su e giù`}
                className="flex h-11 w-10 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragStart.current = { y: e.clientY, before: words.map((x) => x.id) };
                  setDrag({ id: w.id, dy: 0 });
                }}
                onPointerMove={(e) => {
                  if (!dragStart.current || drag?.id !== w.id) return;
                  const dy = e.clientY - dragStart.current.y;
                  const steps = Math.trunc(dy / ROW_H);
                  if (steps !== 0) {
                    const to = Math.max(0, Math.min(words.length - 1, i + steps));
                    if (to !== i) {
                      setWords(move(i, to));
                      dragStart.current.y += (to - i) * ROW_H;
                    }
                  }
                  setDrag({ id: w.id, dy: e.clientY - dragStart.current.y });
                }}
                onPointerUp={() => {
                  const before = dragStart.current?.before.join();
                  dragStart.current = null;
                  setDrag(null);
                  if (before !== words.map((x) => x.id).join()) commitOrder(words);
                }}
                onPointerCancel={() => {
                  dragStart.current = null;
                  setDrag(null);
                }}
                onKeyDown={(e) => {
                  const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : null;
                  if (to === null) return;
                  e.preventDefault();
                  const next = move(i, to);
                  if (next !== words) {
                    setWords(next);
                    commitOrder(next);
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
                </svg>
              </button>
              <Stamp icon={w.icon} color="var(--sj-legend)" size={34} rot={0} opacity={w.active ? 0.92 : 0.4} />
              <span className={`min-w-0 flex-1 text-base font-bold ${w.active ? "" : "text-muted line-through"}`}>
                {w.label}
                {!w.active && <span className="ml-1.5 text-xs font-semibold no-underline">(disattivata)</span>}
              </span>
              <button type="button" aria-label={`Modifica ${w.label}`} className={iconButton} onClick={() => setEditing(w)}>
                <PencilIcon />
              </button>
            </li>
          );
        })}
      </ul>
      <Flash msg={msg} />
      <button type="button" className={dashedButton} onClick={() => setEditing("new")}>
        <PlusIcon />
        <span>Aggiungi voce</span>
      </button>

      {editing && (
        <WordSheet
          word={editing === "new" ? null : editing}
          index={editing === "new" ? -1 : words.findIndex((x) => x.id === editing.id)}
          count={words.length}
          onClose={() => setEditing(null)}
          onMove={async (dir) => {
            if (editing === "new") return;
            const i = words.findIndex((x) => x.id === editing.id);
            const next = move(i, i + dir);
            if (next !== words) {
              setWords(next);
              await commitOrder(next);
            }
          }}
          onSave={async ({ label, icon, active }) => {
            if (editing === "new") {
              const sort_order = words.length + 1;
              const { data, error } = await supabase
                .from("words")
                .insert({ group_id: groupId, label, icon, active, sort_order })
                .select("id, label, icon, sort_order, active")
                .single();
              if (error || !data) return "Voce non salvata: riprova.";
              setWords((ws) => [...ws, data as WordRow]);
              saved.current.set(data.id, sort_order);
            } else {
              const { error } = await supabase.from("words").update({ label, icon, active }).eq("id", editing.id);
              if (error) return "Modifica non salvata: riprova.";
              setWords((ws) => ws.map((x) => (x.id === editing.id ? { ...x, label, icon, active } : x)));
            }
          }}
        />
      )}
    </Section>
  );
}

function WordSheet({
  word,
  index,
  count,
  onSave,
  onMove,
  onClose,
}: {
  word: WordRow | null;
  index: number;
  count: number;
  onSave: (v: { label: string; icon: StampIcon; active: boolean }) => Promise<string | void>;
  onMove: (dir: -1 | 1) => Promise<void>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [label, setLabel] = useState(word?.label ?? "");
  const [icon, setIcon] = useState<StampIcon>(word?.icon ?? "asterisco");
  const [active, setActive] = useState(word?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clean = label.trim();

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
        {word ? "Modifica voce" : "Nuova voce"}
      </h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!clean) return;
          setBusy(true);
          const err = await onSave({ label: clean, icon, active });
          setBusy(false);
          if (err) setError(err);
          else onClose();
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={`${titleId}-label`} className="text-sm font-bold">
            Etichetta
          </label>
          <input
            id={`${titleId}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={24}
            placeholder="es. P****a"
            className="h-[52px] rounded-card border-[1.5px] border-ink bg-paper px-4 text-[17px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-red"
          />
          <span className="text-xs text-muted">Con gli asterischi, come sul cartoncino. Max 24 caratteri.</span>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-bold">Timbro</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {STAMP_ICONS.map((ic) => (
              <label key={ic} className="cursor-pointer">
                <input
                  type="radio"
                  name="icon"
                  value={ic}
                  checked={icon === ic}
                  onChange={() => setIcon(ic)}
                  className="peer sr-only"
                  aria-label={ICON_LABEL[ic]}
                />
                <span
                  className={`flex h-14 items-center justify-center rounded-cell peer-focus-visible:ring-2 peer-focus-visible:ring-red ${icon === ic ? "border-2 border-ink bg-paper" : "border-[1.5px] border-line"}`}
                >
                  <Stamp icon={ic} color="var(--sj-legend)" size={38} rot={0} blend="normal" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[15px] font-bold">Attiva</span>
            <span className="text-xs text-muted">Se la disattivi sparisce dal tabellone; i timbri già dati restano.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-6 shrink-0 accent-[var(--sj-red)]"
          />
        </label>

        {word && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => onMove(-1)}
              className="h-11 flex-1 rounded-button border-[1.5px] border-ink text-sm font-bold disabled:opacity-40"
            >
              ↑ Sposta su
            </button>
            <button
              type="button"
              disabled={index >= count - 1}
              onClick={() => onMove(1)}
              className="h-11 flex-1 rounded-button border-[1.5px] border-ink text-sm font-bold disabled:opacity-40"
            >
              ↓ Sposta giù
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !clean}
          className="h-[50px] rounded-card bg-red text-[15px] font-extrabold text-on-red disabled:opacity-50"
        >
          {busy ? "Salvo…" : "Salva"}
        </button>
      </form>
    </Sheet>
  );
}
