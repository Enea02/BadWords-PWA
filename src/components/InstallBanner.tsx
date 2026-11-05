"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Stamp } from "@design/Stamp";
import { Sheet } from "@/app/(app)/board/Sheets";
import { dismissInstall, getServerSnapshot, getSnapshot, promptInstall, subscribe } from "@/lib/install";

/** "Aggiungi alla schermata Home": prompt nativo su Android/Chrome, istruzioni su iOS Safari. */
export function InstallBanner() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [howTo, setHowTo] = useState(false);

  if (s.standalone || s.dismissed || !(s.canPrompt || s.ios)) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Installa l'app"
        className="mx-4 mt-3 flex items-center gap-3 rounded-card border-[1.5px] border-dashed border-line bg-card py-2 pr-1 pl-3 lg:mx-0 lg:mt-0"
      >
        <Stamp icon="asterisco" size={34} rot={-12} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-tight font-extrabold">Mettimi nella schermata Home</span>
          <span className="text-xs text-muted">Si apre come un&apos;app, anche senza rete.</span>
        </div>
        <button
          type="button"
          onClick={() => (s.canPrompt ? promptInstall() : setHowTo(true))}
          className="h-11 shrink-0 rounded-button bg-red px-4 text-sm font-extrabold text-on-red"
        >
          {s.canPrompt ? "Installa" : "Come si fa"}
        </button>
        <button
          type="button"
          onClick={dismissInstall}
          aria-label="Non ora"
          className="flex size-11 shrink-0 items-center justify-center text-muted"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {howTo && <IosHowTo notSafari={s.iosNotSafari} onClose={() => setHowTo(false)} />}
    </>
  );
}

function IosHowTo({ notSafari, onClose }: { notSafari: boolean; onClose: () => void }) {
  const titleId = useId();
  const steps = [
    ...(notSafari
      ? [{ icon: <SafariIcon />, text: <>Apri questo link in <strong>Safari</strong>: solo da lì si aggiunge alla Home.</> }]
      : []),
    { icon: <ShareIcon />, text: <>Tocca <strong>Condividi</strong> nella barra di Safari.</> },
    { icon: <AddIcon />, text: <>Scorri e scegli <strong>Aggiungi alla schermata Home</strong>.</> },
    { icon: <Stamp icon="asterisco" size={26} rot={-12} />, text: <>Tocca <strong>Aggiungi</strong>: il timbro compare tra le app.</> },
  ];

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
        Aggiungi alla schermata Home
      </h2>
      <ol className="flex flex-col gap-3">
        {steps.map((st, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="receipt w-5 shrink-0 text-sm text-red">{i + 1}</span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-paper text-ink">{st.icon}</span>
            <span className="text-[15px] leading-[1.35]">{st.text}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClose}
        className="h-[50px] rounded-card border-[1.5px] border-ink text-[15px] font-bold text-ink"
      >
        Ho capito
      </button>
    </Sheet>
  );
}

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="icona Condividi">
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

const AddIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="icona Aggiungi">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const SafariIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="icona Safari">
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);
