"use client";

import Link from "next/link";
import { useRef } from "react";
import { Stamp } from "@design/Stamp";
import { girlInk } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { cellKey, progress, stampRot, type Counts, type Girl, type Word } from "@/lib/board";

export type Fresh = { key: string; nonce: number } | null;

type Size = {
  legendW: string;
  cellW: string;
  headH: number;
  rowH: number;
  totH: number;
  stamp: number;
  legendStamp: number;
  avatar: number;
  overlap: [number, number];
  badge: string;
  total: string;
  bar: string;
};

const MOBILE: Size = {
  legendW: "w-[112px]",
  cellW: "w-[78px]",
  headH: 80,
  rowH: 52,
  totH: 92,
  stamp: 30,
  legendStamp: 30,
  avatar: 36,
  overlap: [-13, -26],
  badge: "top-[5px] right-[5px] h-5 min-w-[22px] px-1.5 text-[11px] leading-5",
  total: "text-[26px]",
  bar: "h-1.5 w-[52px]",
};

const DESKTOP: Size = {
  legendW: "w-[180px]",
  cellW: "min-w-24 flex-1",
  headH: 104,
  rowH: 64,
  totH: 104,
  stamp: 36,
  legendStamp: 34,
  avatar: 44,
  overlap: [-14, -31],
  badge: "top-2 right-2.5 h-[22px] min-w-6 px-[7px] text-xs leading-[22px]",
  total: "text-[30px]",
  bar: "h-[7px] w-16",
};

const sticky =
  "sticky left-0 shrink-0 border-r-[1.5px] border-line bg-paper shadow-sticky lg:border-r-0 lg:bg-card lg:shadow-none";

export function BoardGrid({
  girls,
  words,
  counts,
  totals,
  leaders,
  fresh,
  disabled,
  loading = false,
  desktop,
  every = 10,
  onTap,
  onDetails,
}: {
  girls: Girl[];
  words: Word[];
  counts: Counts;
  totals: number[];
  leaders: Set<string>;
  fresh: Fresh;
  disabled: boolean;
  loading?: boolean;
  desktop: boolean;
  every?: number;
  onTap: (g: Girl, w: Word) => void;
  onDetails: (g: Girl, w: Word) => void;
}) {
  const S = desktop ? DESKTOP : MOBILE;

  return (
    <div className="w-max min-w-full lg:w-full">
      <span id="sj-cell-hint" className="sr-only">
        Tocca per timbrare. Tieni premuto per vedere e annullare i timbri.
      </span>

      {/* Ragazze */}
      <div className="sticky top-0 z-[3] flex bg-paper lg:static lg:bg-card">
        <div className={`${sticky} z-[4] flex items-end pb-3 pl-3.5 lg:pl-5 ${S.legendW}`} style={{ height: S.headH }}>
          <span className="receipt text-xs tracking-[0.08em] text-muted">Legenda</span>
        </div>
        {girls.map((g) => {
          const lead = leaders.has(g.id);
          return (
            <div
              key={g.id}
              className={`relative flex shrink-0 flex-col items-center justify-end gap-1.5 pb-2.5 lg:gap-2 lg:border-l lg:border-dashed lg:border-line lg:pb-3.5 ${S.cellW}`}
              style={{ height: S.headH }}
            >
              {lead && <Crown desktop={desktop} />}
              {loading ? (
                <>
                  <div className="anim-pulse rounded-full bg-card2" style={{ width: S.avatar, height: S.avatar }} />
                  <div className="h-[11px] w-11 anim-pulse rounded-md bg-card2" />
                </>
              ) : (
                <>
                  <GirlAvatar name={g.name} color={g.color} avatarUrl={g.avatarUrl} size={S.avatar} leader={lead} />
                  <span className="max-w-full truncate px-1 text-[13px] leading-[1.1] font-bold lg:text-sm">{g.name}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Righe della legenda */}
      {words.map((w, wi) => (
        <div key={w.id} className="flex border-t-[1.5px] border-dashed border-line">
          <div className={`${sticky} z-[2] flex items-center gap-1.5 pr-1 pl-2 lg:gap-3 lg:pr-3 lg:pl-4 ${S.legendW}`} style={{ height: S.rowH }}>
            <Stamp icon={w.icon} color="var(--sj-legend)" size={S.legendStamp} rot={0} blend="normal" opacity={0.92} />
            <span
              className={`min-w-0 leading-[1.15] font-bold lg:text-[15px] lg:tracking-normal ${w.label.length > 8 ? "text-[12px] tracking-[-0.03em]" : "text-[13px]"}`}
            >
              {w.label}
            </span>
          </div>
          {girls.map((g, gi) => {
            const key = cellKey(g.id, w.id);
            return (
              <Cell
                key={key}
                n={loading ? -1 : (counts[key] ?? 0)}
                girl={g}
                word={w}
                wi={wi}
                gi={gi}
                size={S}
                fresh={fresh?.key === key ? fresh.nonce : null}
                disabled={disabled || loading}
                onTap={() => onTap(g, w)}
                onDetails={() => onDetails(g, w)}
              />
            );
          })}
        </div>
      ))}

      {/* Totali */}
      <div className="flex border-t-2 border-ink">
        <div className={`${sticky} z-[2] flex flex-col justify-center gap-0.5 pr-2 pl-3.5 lg:pr-3 lg:pl-5 ${S.legendW}`} style={{ height: S.totH }}>
          <span className="font-display text-base lg:text-lg">Totale</span>
          <span className="text-[11px] leading-[1.25] text-muted lg:text-xs">verso la prossima penitenza</span>
        </div>
        {girls.map((g, gi) => {
          const n = totals[gi] ?? 0;
          const p = progress(n, every);
          const ink = girlInk(g.color);
          return (
            <div
              key={g.id}
              className={`flex shrink-0 flex-col items-center justify-center gap-[7px] border-l border-dashed border-line lg:gap-2 ${S.cellW}`}
              style={{ height: S.totH }}
            >
              {loading ? (
                <>
                  <div className="h-[22px] w-[30px] anim-pulse rounded-md bg-card2" />
                  <div className={`anim-pulse rounded-full bg-card2 ${S.bar}`} />
                </>
              ) : (
                <>
                  <span className={`font-display leading-none ${S.total}`} style={{ color: ink }}>
                    {n}
                  </span>
                  <div
                    className={`overflow-hidden rounded-full bg-card2 ${S.bar}`}
                    role="progressbar"
                    aria-label={`${g.name}: ${n} timbri, prossima penitenza a ${p.next}`}
                    aria-valuemin={p.next - every}
                    aria-valuemax={p.next}
                    aria-valuenow={n}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${p.pct}%`, background: p.hot || p.unlocked ? "var(--sj-red)" : ink }}
                    />
                  </div>
                  {p.unlocked ? (
                    <Link href="/penitenze" className="text-[11px] font-extrabold text-red underline underline-offset-2 lg:text-xs">
                      Penitenza!
                    </Link>
                  ) : (
                    <span className={`text-[11px] font-extrabold lg:text-xs ${p.hot ? "text-red" : "text-muted"}`}>
                      {n}/{p.next}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Crown({ desktop }: { desktop: boolean }) {
  return (
    <svg
      viewBox="0 0 24 18"
      width={desktop ? 28 : 24}
      height={desktop ? 21 : 18}
      role="img"
      aria-label="In testa alla classifica"
      className="absolute left-1/2 z-[1] -translate-x-1/2 -rotate-[10deg]"
      style={{ top: desktop ? 8 : 1 }}
    >
      <path
        d="M2 5 L7 9.5 L12 2 L17 9.5 L22 5 L20 16 H4 Z"
        style={{ fill: "var(--sj-gold)", stroke: desktop ? "var(--sj-card)" : "var(--sj-paper)", strokeWidth: 1.5, strokeLinejoin: "round" }}
      />
    </svg>
  );
}

const LONG_PRESS_MS = 500;

function Cell({
  n,
  girl,
  word,
  wi,
  gi,
  size: S,
  fresh,
  disabled,
  onTap,
  onDetails,
}: {
  n: number;
  girl: Girl;
  word: Word;
  wi: number;
  gi: number;
  size: Size;
  fresh: number | null;
  disabled: boolean;
  onTap: () => void;
  onDetails: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const ink = girlInk(girl.color);
  const loading = n < 0;
  const shown = loading ? 0 : Math.min(n, 3);
  const pile = n > 3;

  return (
    <button
      type="button"
      aria-label={loading ? `${girl.name}, ${word.label}` : `${girl.name}, ${word.label}: ${n} ${n === 1 ? "timbro" : "timbri"}`}
      aria-describedby="sj-cell-hint"
      aria-disabled={disabled || undefined}
      className={`relative flex shrink-0 touch-manipulation items-center justify-center border-l border-dashed border-line select-none [-webkit-touch-callout:none] focus-visible:z-[1] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red ${S.cellW} ${disabled ? "cursor-default" : "cursor-pointer active:bg-card2/60"}`}
      style={{ height: S.rowH }}
      onPointerDown={(e) => {
        longFired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = setTimeout(() => {
          longFired.current = true;
          navigator.vibrate?.(8);
          onDetails();
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        // Se si sta scorrendo il tabellone non è una pressione lunga.
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancel();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!longFired.current) {
          cancel();
          longFired.current = true;
          onDetails();
        }
      }}
      onClick={() => {
        if (longFired.current) {
          longFired.current = false;
          return;
        }
        if (!disabled) onTap();
      }}
    >
      {fresh !== null && (
        <>
          <span
            key={`bg-${fresh}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-1 rounded-cell border-2 anim-fade"
            style={{ borderColor: ink, background: `color-mix(in srgb, ${ink} 9%, transparent)` }}
          />
          <span
            key={`ring-${fresh}`}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -mt-5 -ml-5 size-10 rounded-full border-2 anim-ring"
            style={{ borderColor: ink }}
          />
        </>
      )}

      {loading && <span className="h-3.5 w-10 anim-pulse rounded-full bg-card2" />}
      {!loading && n === 0 && (
        <span aria-hidden="true" className="size-[26px] rounded-full border-[1.5px] border-dashed border-line lg:size-[30px]" />
      )}

      {Array.from({ length: shown }, (_, k) => {
        const last = fresh !== null && k === shown - 1;
        return (
          <span
            key={last ? `s${k}-${fresh}` : `s${k}`}
            aria-hidden="true"
            className={`relative ${last ? "anim-press" : ""}`}
            style={{
              marginLeft: k === 0 ? 0 : pile ? S.overlap[1] : S.overlap[0],
              transform: last ? undefined : `translateY(${pile ? [2, -1, 1][k] : [0, -4, 3][k]}px)`,
            }}
          >
            <Stamp icon={word.icon} color={ink} size={S.stamp} rot={stampRot(wi, gi, k)} />
          </span>
        );
      })}

      {pile && (
        <span
          aria-hidden="true"
          className={`absolute z-[1] rotate-6 rounded-full bg-ink text-center font-extrabold text-paper ${S.badge}`}
        >
          ×{n}
        </span>
      )}
    </button>
  );
}
