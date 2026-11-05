"use client";

import { useState } from "react";
import { Stamp } from "@design/Stamp";
import { girlAvatar, type GirlColor } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { MonthEnd } from "@/components/MonthEnd";
import { useDecideMonthly } from "@/components/MonthEndHost";
import { monthTitle, monthYear, summarize, type Closure } from "@/lib/monthEnd";

type G = { id: string; name: string; color: GirlColor; avatarUrl: string | null };

export function HistoryList({ closures: initial, girls, isAdmin }: { closures: Closure[]; girls: G[]; isAdmin: boolean }) {
  const [closures, setClosures] = useState(initial);
  const [open, setOpen] = useState<Closure | null>(null);
  const decide = useDecideMonthly(open, (c) => {
    setOpen(c);
    setClosures((cs) => cs.map((x) => (x.month === c.month ? c : x)));
  });

  const avatars = Object.fromEntries(girls.map((g) => [g.id, { avatarUrl: g.avatarUrl, color: g.color }]));
  // Colore attuale se la ragazza c'è ancora, altrimenti quello dello snapshot.
  const colorOf = (id: string, fallback: GirlColor) => girls.find((g) => g.id === id)?.color ?? fallback;

  // Corone vinte (a pari merito vale per tutte), per le ragazze attuali del gruppo.
  const wins = new Map<string, number>();
  for (const c of closures) for (const w of summarize(c.snapshot).winners) wins.set(w.profile_id, (wins.get(w.profile_id) ?? 0) + 1);
  const crowns = [...girls].sort((a, b) => (wins.get(b.id) ?? 0) - (wins.get(a.id) ?? 0));

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-[18px] px-5 pt-[54px] pb-32 lg:max-w-2xl lg:pt-10 lg:pb-10">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-[34px] leading-[1.1]">Storico</h1>
        <span className="text-[13px] text-muted">Ogni mese chiuso, con la sua bocca sporca.</span>
      </header>

      {closures.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line px-4 py-10 text-center">
          <Stamp icon="asterisco" color="var(--sj-muted)" size={48} rot={-8} />
          <span className="font-display text-lg">Ancora nessun mese chiuso</span>
          <span className="text-sm text-muted">Il primo cartoncino si chiude l&apos;1 del mese.</span>
        </div>
      ) : (
        <>
          <section aria-labelledby="sj-crowns" className="flex shrink-0 flex-col gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line px-3.5 pt-3.5 pb-3">
            <h2 id="sj-crowns" className="receipt text-xs tracking-[0.1em] text-muted">
              Corone vinte
            </h2>
            <ul className="grid grid-cols-5 gap-x-1.5 gap-y-3">
              {crowns.map((g) => {
                const n = wins.get(g.id) ?? 0;
                return (
                  <li key={g.id} className="flex min-w-0 flex-col items-center gap-1">
                    <GirlAvatar name={g.name} color={g.color} avatarUrl={g.avatarUrl} size={40} />
                    <span className="max-w-full truncate text-xs font-bold">{g.name}</span>
                    <span className={`flex items-center gap-[3px] font-display text-[15px] ${n ? "text-ink" : "text-muted"}`} aria-label={`${n} corone`}>
                      <svg viewBox="0 0 24 18" width="16" height="12" aria-hidden="true">
                        <path d="M2 5 L7 9.5 L12 2 L17 9.5 L22 5 L20 16 H4 Z" style={{ fill: n ? "var(--sj-gold)" : "var(--sj-line)" }} />
                      </svg>
                      <span>{n}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {closures.map((c) => {
            const s = summarize(c.snapshot);
            const parts = s.rows.filter((r) => r.total > 0);
            const lead = s.winners[0];
            return (
              <article key={c.month} className="shrink-0 rounded-md bg-card shadow-[0_1px_0_var(--sj-line),0_6px_16px_rgb(var(--sj-shadow-rgb)/0.08)]">
                <button
                  type="button"
                  onClick={() => setOpen(c)}
                  aria-label={`Apri ${monthTitle(c.month)} ${monthYear(c.month)}`}
                  className="flex w-full flex-col gap-3 p-4 text-left"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-[22px] leading-none">
                      {monthTitle(c.month)} <span className="text-[15px] text-muted">{monthYear(c.month)}</span>
                    </h3>
                    <span className="text-[13px] font-bold text-muted">
                      {s.total} {s.total === 1 ? "timbro" : "timbri"} in tutto
                    </span>
                  </div>

                  {lead ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex shrink-0">
                        {s.winners.slice(0, 3).map((w, i) => (
                          <div key={w.profile_id} style={{ marginLeft: i ? -12 : 0 }}>
                            <GirlAvatar
                              name={w.display_name}
                              color={colorOf(w.profile_id, w.color)}
                              avatarUrl={avatars[w.profile_id]?.avatarUrl ?? null}
                              size={36}
                              leader
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-[15px] font-extrabold">{s.winnerNames}</span>
                        <span className="text-xs text-muted">Bocca sporca con {s.max} timbri</span>
                      </div>
                      {c.penance && (
                        <span
                          className={`flex h-[26px] shrink-0 items-center gap-1 rounded-full border-[1.5px] px-2.5 text-xs font-extrabold whitespace-nowrap ${c.penance.status === "done" ? "border-done-ink text-done-ink" : "border-red text-red"}`}
                        >
                          {c.penance.status === "done" && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          )}
                          <span>{c.penance.status === "done" ? "Scontata" : c.penance.awaiting ? "Da decidere" : "Da scontare"}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Mese immacolato: nessun timbro.</span>
                  )}

                  {parts.length > 0 && (
                    <>
                      <div
                        role="img"
                        aria-label={`Timbri di ${monthTitle(c.month)}: ${parts.map((p) => `${p.display_name} ${p.total}`).join(", ")}`}
                        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
                      >
                        {parts.map((p) => (
                          <div key={p.profile_id} style={{ flex: `${p.total} 1 0`, background: girlAvatar(colorOf(p.profile_id, p.color)) }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {parts.map((p) => (
                          <span key={p.profile_id} className="flex items-center gap-[5px] text-xs text-muted">
                            <span className="size-2 rounded-full" style={{ background: girlAvatar(colorOf(p.profile_id, p.color)) }} />
                            <span>
                              {p.display_name} <strong className="text-ink">{p.total}</strong>
                            </span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </>
      )}

      {open && (
        <MonthEnd
          closure={open}
          avatars={avatars}
          isAdmin={isAdmin}
          onClose={() => setOpen(null)}
          onDecide={decide}
          closeLabel="Torna allo storico"
        />
      )}
    </main>
  );
}
