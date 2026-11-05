"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { girlAvatar, type GirlColor } from "@design/girls";
import { DecidePenance } from "@/components/DecidePenance";
import { GirlAvatar } from "@/components/GirlAvatar";
import { monthTitle, monthYear, nextMonthTitle, summarize, type Closure } from "@/lib/monthEnd";
import { FALLBACK_TEXT } from "@/lib/penances";

export type AvatarInfo = { avatarUrl: string | null; color: GirlColor };

/**
 * Board "7 · Fine mese": la bocca sporca del mese, a tutto schermo.
 * `onDecide` scrive il testo (solo admin, modalità "sul momento") su tutte le assegnazioni del mese.
 */
export function MonthEnd({
  closure,
  avatars,
  isAdmin,
  onClose,
  onDecide,
  closeLabel,
}: {
  closure: Closure;
  avatars: Record<string, AvatarInfo>;
  isAdmin: boolean;
  onClose: () => void;
  onDecide: (text: string) => Promise<boolean>;
  closeLabel?: string;
}) {
  const id = useId().replace(/:/g, "");
  const button = useRef<HTMLButtonElement>(null);
  const [shared, setShared] = useState<string | null>(null);
  const s = summarize(closure.snapshot);
  const title = monthTitle(closure.month);
  const year = monthYear(closure.month);
  const empty = s.max === 0;
  const p = closure.penance;
  // Il portale su document.body esiste solo nel browser: sul server non si disegna niente.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => button.current?.focus(), 700);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [onClose]);

  const avatar = (r: { profile_id: string; display_name: string; color: GirlColor }, size: number, leader = false) => {
    const a = avatars[r.profile_id];
    return <GirlAvatar name={r.display_name} color={a?.color ?? r.color} avatarUrl={a?.avatarUrl ?? null} size={size} leader={leader} />;
  };

  const share = async () => {
    const text = empty
      ? `Bad Words · ${title} ${year}: nessun timbro. Mese immacolato!`
      : `Bad Words · ${title} ${year}: bocca sporca del mese ${s.winners.length > 1 ? "sono" : "è"} ${s.winnerNames} (${s.subtitle}).${p?.text ? ` Penitenza: ${p.text}` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared("Copiato: incollalo nel gruppo.");
    } catch {
      /* condivisione annullata */
    }
  };

  // Podio: 2ª, 1ª, 3ª.
  const order = s.podium.length === 3 ? [1, 0, 2] : s.podium.length === 2 ? [1, 0] : [0];
  // Altezza del gradino dal piazzamento: a pari merito stessa altezza.
  const stepHeight = (rank: number) => [80, 58, 44][Math.min(rank, 3) - 1];

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-50 overflow-y-auto bg-night text-night-ink"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -inset-[30%]"
        style={{ background: "repeating-conic-gradient(from 0deg at 50% 30%, rgb(231 177 74 / 0.06) 0deg 6deg, transparent 6deg 12deg)" }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col items-center gap-3 px-[22px] pt-[54px] pb-[34px]">
        <span className="receipt text-[13px] text-night-muted">
          {title} {year} · cartoncino chiuso
        </span>
        <h1 id={`${id}-title`} className="text-center font-display text-[32px] leading-[1.05]">
          {empty ? "Mese immacolato" : "Bocca sporca del mese"}
        </h1>

        {empty ? (
          <p className="max-w-[300px] py-10 text-center text-base text-night-muted">
            Nessun timbro a {title.toLowerCase()}: miracolo. Niente penitenza grossa.
          </p>
        ) : (
          <>
            <div className="relative mt-1 size-[168px]">
              <WinnerRing id={id} label={`BOCCA SPORCA • ${title.toUpperCase()} ${year} • BOCCA SPORCA •`} />
              <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2">
                {s.winners.length === 1
                  ? avatar(s.winners[0], 92, true)
                  : s.winners.slice(0, 3).map((w, i) => (
                      <div key={w.profile_id} className="rounded-full shadow-[0_0_0_3px_var(--sj-night)]" style={{ marginLeft: i ? -18 : 0 }}>
                        {avatar(w, 60, true)}
                      </div>
                    ))}
              </div>
              <svg viewBox="0 0 24 18" width="46" height="34" role="img" aria-label="Corona" className="absolute top-3.5 left-1/2 -translate-x-1/2 -rotate-10">
                <path d="M2 5 L7 9.5 L12 2 L17 9.5 L22 5 L20 16 H4 Z" style={{ fill: "var(--sj-night-gold)", stroke: "var(--sj-night)", strokeWidth: 1.4, strokeLinejoin: "round" }} />
              </svg>
            </div>

            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="font-display text-[30px] leading-[1.1]">{s.winnerNames}</span>
              <span className="text-[15px] font-bold text-night-gold">{s.subtitle}</span>
            </div>

            <div className="mt-1 flex w-full -rotate-[1.5deg] flex-col gap-1.5 rounded-md bg-card px-[18px] pt-3.5 pb-4 text-ink shadow-[0_10px_24px_rgb(0_0_0/0.35)]">
              <span className="receipt text-xs text-red">Penitenza grossa · per {s.winnerNames}</span>
              {p?.awaiting && isAdmin ? (
                <DecidePenance onDecide={onDecide} label="Decidi la penitenza grossa" />
              ) : p?.awaiting ? (
                <p className="font-display text-[21px] leading-[1.2] text-muted">Da decidere: ci pensa l&apos;admin.</p>
              ) : (
                <p className="font-display text-[21px] leading-[1.2]">{p?.text ?? FALLBACK_TEXT}</p>
              )}
            </div>

            <div role="list" aria-label="Podio" className="mt-2.5 grid w-full grid-cols-3 items-end gap-2">
              {order.map((idx) => {
                const r = s.podium[idx];
                return (
                  <div key={r.profile_id} role="listitem" className={`flex flex-col items-center gap-1.5 ${s.podium.length === 2 && idx === 1 ? "col-start-1" : ""}`}>
                    {avatar(r, 38)}
                    <span className="max-w-full truncate text-[13px] font-bold">{r.display_name}</span>
                    <div
                      className="flex w-full flex-col items-center justify-center rounded-t-[8px] bg-night-card"
                      style={{ height: stepHeight(r.rank), borderTop: `4px solid ${girlAvatar(avatars[r.profile_id]?.color ?? r.color)}` }}
                    >
                      <span className="font-display text-[22px] leading-none">{r.total}</span>
                      <span className="font-receipt text-[11px] font-bold text-night-muted">{r.rank}ª</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {s.othersLine && <span className="text-center text-[13px] text-night-muted">{s.othersLine}</span>}
          </>
        )}

        <div className="min-h-4 flex-1" />

        <button
          ref={button}
          type="button"
          onClick={onClose}
          className="flex h-[54px] w-full items-center justify-center rounded-[27px] bg-night-red text-base font-extrabold text-night shadow-[0_4px_0_var(--sj-night-red-shadow)] active:translate-y-[3px]"
        >
          {closeLabel ?? `Si riparte: apri ${nextMonthTitle(closure.month)}`}
        </button>
        <button type="button" onClick={share} className="min-h-11 text-[15px] font-bold underline underline-offset-[3px]">
          Condividi nel gruppo
        </button>
        {shared && (
          <span role="status" className="text-[13px] text-night-muted">
            {shared}
          </span>
        )}
      </div>
    </div>,
    document.body,
  );
}

function WinnerRing({ id, label }: { id: string; label: string }) {
  return (
    <svg viewBox="0 0 236 236" width="168" height="168" aria-hidden="true" className="absolute inset-0 text-night-red anim-spin">
      <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={6} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves={1} seed={3} result="s" />
        <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.15" result="m" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
      <defs>
        <path id={`${id}-arc`} d="M118,118 m-94,0 a94,94 0 1,1 188,0 a94,94 0 1,1 -188,0" />
      </defs>
      <g filter={`url(#${id}-ink)`} fill="none" stroke="currentColor">
        <circle cx="118" cy="118" r="114" strokeWidth="5" />
        <circle cx="118" cy="118" r="76" strokeWidth="2" />
        <text className="font-display" fontSize="19" fill="currentColor" stroke="none" letterSpacing="2">
          <textPath href={`#${id}-arc`} textLength="586" lengthAdjust="spacing">
            {label}
          </textPath>
        </text>
      </g>
    </svg>
  );
}

const noopSubscribe = () => () => {};
