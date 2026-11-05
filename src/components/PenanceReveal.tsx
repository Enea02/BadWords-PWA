"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FALLBACK_TEXT, monthName, type PenanceItem } from "@/lib/penances";
import { ticketDate } from "@/lib/month";

/**
 * Board "5 · Penitenza sbloccata": a tutto schermo, sopra tutto.
 * `mine` = la vede l'interessata ("Accetto il mio destino"); altrimenti chi ha messo il timbro.
 */
export function PenanceReveal({
  penance,
  name,
  mine,
  timezone,
  onAccept,
}: {
  penance: PenanceItem;
  name: string;
  mine: boolean;
  timezone: string;
  onAccept: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const button = useRef<HTMLButtonElement>(null);
  const threshold = penance.threshold ?? 10;
  const n = threshold / 10;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => button.current?.focus(), 1100);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, []);

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      className="fixed inset-0 z-50 overflow-y-auto bg-penance-bg text-penance-ink"
    >
      {/* Raggiera e grana */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -inset-[40%]"
        style={{ background: "repeating-conic-gradient(from 0deg at 50% 38%, rgb(0 0 0 / 0.09) 0deg 7deg, transparent 7deg 14deg)" }}
      />
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 size-full opacity-35">
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.04  0 0 0 0 0.02  1.3 0 0 0 -0.6" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id}-grain)`} />
      </svg>

      <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col items-center gap-4 px-6 pt-16 pb-10">
        <span className="receipt text-[13px] tracking-[0.14em] opacity-90">
          {name} · quota {threshold} raggiunta
        </span>

        <div className="size-[236px] anim-slam">
          <BigStamp id={id} n={threshold} />
        </div>

        <h1 id={`${id}-title`} className="text-center font-display text-[30px] leading-[1.1] text-balance">
          Il cartoncino ha parlato.
        </h1>

        <div className="relative mt-1.5 w-full rounded-md bg-card text-ink shadow-[0_14px_30px_rgb(40_6_2/0.35)] anim-rise">
          <div className="flex flex-col gap-2.5 px-[22px] pt-5 pb-[18px]">
            <span className="receipt text-xs tracking-[0.06em] text-red">
              Penitenza piccola · N°{n} di {monthName(penance.month)}
            </span>
            <p id={`${id}-text`} className="font-display text-[27px] leading-[1.15] text-balance">
              {penance.text ?? FALLBACK_TEXT}
            </p>
          </div>
          <div className="mx-3.5 border-t-2 border-dashed border-line" />
          <div aria-hidden="true" className="absolute -left-[11px] size-[22px] rounded-full bg-penance-bg" style={{ top: "calc(100% - 52px)" }} />
          <div aria-hidden="true" className="absolute -right-[11px] size-[22px] rounded-full bg-penance-bg" style={{ top: "calc(100% - 52px)" }} />
          <div className="flex items-center justify-between gap-3 px-[22px] pt-3 pb-3.5 text-xs text-muted">
            <span>{penance.text ? "Pescata a caso dal mazzo del gruppo" : "Il mazzo era vuoto: decidete voi"}</span>
            <span className="font-receipt font-bold">{ticketDate(penance.createdAt, timezone)}</span>
          </div>
        </div>

        <div className="flex-1" />

        <button
          ref={button}
          type="button"
          onClick={onAccept}
          className="flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[29px] bg-penance-ink text-[17px] font-extrabold text-penance-btn-ink shadow-[0_5px_0_var(--sj-penance-btn-shadow)] anim-fade-late active:translate-y-[3px] active:shadow-[0_2px_0_var(--sj-penance-btn-shadow)]"
        >
          {mine ? "Accetto il mio destino" : "Torna al tabellone"}
        </button>
        <p className="text-center text-[13px] leading-[1.4] opacity-90">
          {mine ? "Le amiche ricevono la notizia adesso." : `${name} riceve la notizia adesso.`} Prossima tappa: {threshold + 10} timbri.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function BigStamp({ id, n }: { id: string; n: number }) {
  return (
    <svg viewBox="0 0 236 236" width="236" height="236" role="img" aria-label={`Timbro: penitenza sbloccata, ${n} timbri`} className="block">
      <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={4} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves={1} seed={11} result="s" />
        <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.1" result="m" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
      <defs>
        <path id={`${id}-arc`} d="M118,118 m-90,0 a90,90 0 1,1 180,0 a90,90 0 1,1 -180,0" />
      </defs>
      <g filter={`url(#${id}-ink)`} fill="none" stroke="currentColor">
        <circle cx="118" cy="118" r="113" strokeWidth="5" />
        <circle cx="118" cy="118" r="104" strokeWidth="1.6" />
        <circle cx="118" cy="118" r="74" strokeWidth="2.4" />
        <text className="font-display" fontSize="17" fill="currentColor" stroke="none" letterSpacing="2">
          <textPath href={`#${id}-arc`} textLength="560" lengthAdjust="spacing">
            PENITENZA SBLOCCATA • PENITENZA SBLOCCATA •
          </textPath>
        </text>
        <text x="118" y="132" textAnchor="middle" className="font-display" fontSize={n >= 100 ? 60 : 76} fill="currentColor" stroke="none">
          {n}
        </text>
        <text x="118" y="160" textAnchor="middle" className="font-receipt" fontWeight="700" fontSize="13" letterSpacing="4" fill="currentColor" stroke="none">
          TIMBRI
        </text>
      </g>
    </svg>
  );
}
