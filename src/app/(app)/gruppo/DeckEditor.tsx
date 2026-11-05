"use client";

import { useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "../board/Sheets";
import { PenanceModeToggle } from "./PenanceModeToggle";
import type { PenanceMode } from "./actions";
import { ConfirmSheet, Flash, PencilIcon, PlusIcon, Section, TrashIcon, dashedButton, iconButton, useFlash } from "./shared";

export type PenanceRow = { id: string; kind: "small" | "monthly"; text: string };

const MIN = 5;
const MAX = 30;
const STEP = 5;

/** Board Admin · Mazzo penitenze: modalità, soglia, carte piccole e grosse. */
export function DeckEditor({
  groupId,
  mode,
  every: initialEvery,
  initial,
}: {
  groupId: string;
  mode: PenanceMode;
  every: number;
  initial: PenanceRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [every, setEvery] = useState(initialEvery);
  const [cards, setCards] = useState(initial);
  const [editing, setEditing] = useState<PenanceRow | { kind: PenanceRow["kind"] } | null>(null);
  const [removing, setRemoving] = useState<PenanceRow | null>(null);
  const [msg, setMsg] = useFlash();

  const changeEvery = async (next: number) => {
    if (next < MIN || next > MAX) return;
    const prev = every;
    setEvery(next);
    const { data, error } = await supabase.from("groups").update({ penance_every: next }).eq("id", groupId).select("id");
    if (error || !data?.length) {
      setEvery(prev);
      setMsg("Soglia non salvata: riprova.");
    } else setMsg(`Ora una penitenza piccola ogni ${next} timbri.`);
  };

  const decks = [
    { kind: "small" as const, title: "Piccole", ink: "text-muted", sub: (n: number) => `${n} ${n === 1 ? "carta" : "carte"} · pescate a caso` },
    { kind: "monthly" as const, title: "Grosse", ink: "text-red", sub: (n: number) => `${n} ${n === 1 ? "carta" : "carte"} · a fine mese` },
  ];

  return (
    <Section id="sj-pen" title="Mazzo penitenze">
      <PenanceModeToggle initial={mode} isAdmin />

      <div className="flex items-center justify-between gap-3 rounded-card border-[1.5px] border-line bg-card py-3 pr-3 pl-4">
        <div className="flex flex-col gap-0.5">
          <span id="sj-every" className="text-[15px] font-bold">
            Una piccola ogni
          </span>
          <span className="text-xs text-muted">La grossa va alla bocca sporca del mese.</span>
        </div>
        <div className="flex items-center gap-1" role="group" aria-labelledby="sj-every">
          <button
            type="button"
            aria-label="Diminuisci soglia"
            disabled={every <= MIN}
            onClick={() => changeEvery(every - STEP)}
            className="size-11 rounded-full border-[1.5px] border-ink text-xl font-bold disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-11 text-center font-display text-[22px]" aria-live="polite" aria-label={`${every} timbri`}>
            {every}
          </span>
          <button
            type="button"
            aria-label="Aumenta soglia"
            disabled={every >= MAX}
            onClick={() => changeEvery(every + STEP)}
            className="size-11 rounded-full border-[1.5px] border-ink text-xl font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <Flash msg={msg} />

      {decks.map((d) => {
        const list = cards.filter((c) => c.kind === d.kind);
        return (
          <div key={d.kind} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <h3 className={`receipt text-[13px] tracking-[0.1em] ${d.ink}`}>{d.title}</h3>
              <span className="text-xs text-muted">{d.sub(list.length)}</span>
            </div>
            {list.length === 0 && (
              <p className="rounded-md border-[1.5px] border-dashed border-line px-3.5 py-3 text-[13px] text-muted">
                Mazzo vuoto: le {d.kind === "small" ? "piccole" : "grosse"} saranno &ldquo;a scelta del gruppo&rdquo;
                {mode === "custom" ? ", ma in modalità sul momento le scrivi comunque tu." : "."}
              </p>
            )}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {list.map((p) => (
                <li key={p.id} className="flex min-h-14 items-center gap-2 rounded-md bg-card py-1.5 pr-1.5 pl-3.5 shadow-[0_1px_0_var(--sj-line)]">
                  <span className="min-w-0 flex-1 text-[15px] leading-[1.3] font-semibold">{p.text}</span>
                  <button type="button" aria-label={`Modifica: ${p.text}`} className={iconButton} onClick={() => setEditing(p)}>
                    <PencilIcon />
                  </button>
                  <button type="button" aria-label={`Elimina: ${p.text}`} className={`${iconButton} text-red`} onClick={() => setRemoving(p)}>
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <button type="button" className={dashedButton} onClick={() => setEditing({ kind: "small" })}>
        <PlusIcon />
        <span>Aggiungi penitenza</span>
      </button>

      {editing && (
        <PenanceSheet
          card={"id" in editing ? editing : null}
          defaultKind={editing.kind}
          onClose={() => setEditing(null)}
          onSave={async ({ text, kind }) => {
            if ("id" in editing) {
              const { error } = await supabase.from("penances").update({ text, kind }).eq("id", editing.id);
              if (error) return "Modifica non salvata: riprova.";
              setCards((cs) => cs.map((c) => (c.id === editing.id ? { ...c, text, kind } : c)));
            } else {
              const { data, error } = await supabase
                .from("penances")
                .insert({ group_id: groupId, kind, text })
                .select("id, kind, text")
                .single();
              if (error || !data) return "Penitenza non salvata: riprova.";
              setCards((cs) => [...cs, data as PenanceRow]);
            }
          }}
        />
      )}

      {removing && (
        <ConfirmSheet
          title="Togliere dal mazzo?"
          body={
            <>
              &ldquo;{removing.text}&rdquo; non verrà più pescata. Le penitenze già assegnate con questo testo restano.
            </>
          }
          confirmLabel="Togli dal mazzo"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            // Mai DELETE: le assegnazioni passate devono mantenere il testo.
            const { error } = await supabase.from("penances").update({ active: false }).eq("id", removing.id);
            if (error) return "Non riuscito: riprova.";
            setCards((cs) => cs.filter((c) => c.id !== removing.id));
          }}
        />
      )}
    </Section>
  );
}

function PenanceSheet({
  card,
  defaultKind,
  onSave,
  onClose,
}: {
  card: PenanceRow | null;
  defaultKind: PenanceRow["kind"];
  onSave: (v: { text: string; kind: PenanceRow["kind"] }) => Promise<string | void>;
  onClose: () => void;
}) {
  const titleId = useId();
  const [text, setText] = useState(card?.text ?? "");
  const [kind, setKind] = useState(card?.kind ?? defaultKind);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clean = text.trim();

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
        {card ? "Modifica penitenza" : "Nuova penitenza"}
      </h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!clean) return;
          setBusy(true);
          const err = await onSave({ text: clean, kind });
          setBusy(false);
          if (err) setError(err);
          else onClose();
        }}
      >
        <fieldset className="m-0 grid grid-cols-2 gap-1 rounded-2xl border-0 bg-card2 p-1">
          <legend className="sr-only">Tipo</legend>
          {(
            [
              ["small", "Piccola"],
              ["monthly", "Grossa"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="peer sr-only" />
              <span
                className={`flex h-11 items-center justify-center rounded-[12px] text-[15px] peer-focus-visible:ring-2 peer-focus-visible:ring-red ${kind === k ? "bg-card font-extrabold shadow-[0_1px_2px_rgb(var(--sj-shadow-rgb)/0.18)]" : "font-semibold"}`}
              >
                {label}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${titleId}-text`} className="text-sm font-bold">
            Testo
          </label>
          <textarea
            id={`${titleId}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="es. Per 24 ore parli solo in rima."
            className="resize-none rounded-cell border-[1.5px] border-ink bg-paper px-3 py-2.5 font-display text-lg leading-[1.2] outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted focus-visible:ring-2 focus-visible:ring-red"
          />
        </div>
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
