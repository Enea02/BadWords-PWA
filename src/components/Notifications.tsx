"use client";

import { useState, useSyncExternalStore } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { enablePush, disablePush, getPushServerState, getPushState, subscribePush, type PushState } from "@/lib/push";

const usePushState = () => useSyncExternalStore(subscribePush, getPushState, getPushServerState);

const HINTS: Record<PushState, string> = {
  loading: "Controllo…",
  unsupported: "Questo browser non supporta le notifiche.",
  "needs-install": "Su iPhone arrivano solo dall'app: prima aggiungila alla schermata Home, poi attivale da lì.",
  "no-sw": "Le notifiche funzionano nell'app pubblicata (in sviluppo il service worker è spento).",
  denied: "Le hai bloccate: riattivale dalle impostazioni del browser o del telefono per questo sito.",
  off: "Penitenze sbloccate, penitenze decise e fine del mese.",
  on: "Attive su questo dispositivo: penitenze sbloccate, penitenze decise e fine del mese.",
};

/** Gruppo → Notifiche: interruttore per QUESTO dispositivo. */
export function PushToggle() {
  const state = usePushState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usable = state === "on" || state === "off";

  return (
    <section aria-labelledby="sj-push" className="flex flex-col gap-2.5">
      <h2 id="sj-push" className="font-display text-xl">
        Notifiche
      </h2>
      <label
        className={`flex min-h-[60px] items-center justify-between gap-3 rounded-card border-[1.5px] border-line bg-card px-4 py-3 ${usable ? "cursor-pointer" : ""}`}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">Avvisami su questo telefono</span>
          <span className="text-xs leading-[1.35] text-muted">{HINTS[state]}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={state === "on"}
          disabled={!usable || busy}
          aria-busy={busy}
          onChange={async (e) => {
            setBusy(true);
            setError(null);
            if (e.target.checked) {
              const res = await enablePush();
              if (res.error) setError(res.error);
            } else {
              await disablePush();
            }
            setBusy(false);
          }}
          className="size-6 shrink-0 accent-[var(--sj-red)] disabled:opacity-40"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
    </section>
  );
}

const CARD_KEY = "sj-push-card-dismissed";

/**
 * Card una tantum sul tabellone, solo dall'app installata (il banner di installazione occupa lo stesso posto):
 * "Vuoi sapere quando scatta una penitenza?".
 */
export function PushCard() {
  const state = usePushState();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissed = useSyncExternalStore(
    noop,
    () => localStorage.getItem(CARD_KEY) === "1",
    () => true,
  );
  const standalone = useSyncExternalStore(
    noop,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );

  if (hidden || dismissed || !standalone || state !== "off" || Notification.permission !== "default") return null;

  const close = () => {
    localStorage.setItem(CARD_KEY, "1");
    setHidden(true);
  };

  return (
    <div
      role="region"
      aria-label="Attiva le notifiche"
      className="mx-4 mt-3 flex flex-col gap-1 rounded-card border-[1.5px] border-dashed border-line bg-card py-2 pr-1 pl-3 lg:mx-0 lg:mt-0"
    >
      <div className="flex items-center gap-3">
        <BrandLogo size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-tight font-extrabold">Vuoi sapere quando scatta una penitenza?</span>
          <span className="text-xs text-muted">Ti avviso io, anche ad app chiusa.</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            const res = await enablePush();
            if (res.error) setError(res.error);
            else close();
          }}
          className="h-11 shrink-0 rounded-button bg-red px-4 text-sm font-extrabold text-on-red"
        >
          Attiva
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Non ora"
          className="flex size-11 shrink-0 items-center justify-center text-muted"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {error && (
        <p role="alert" className="pb-1 text-xs font-bold text-red">
          {error}
        </p>
      )}
    </div>
  );
}

const noop = () => () => {};
