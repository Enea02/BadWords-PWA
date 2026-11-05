"use client";

/**
 * Stato dell'installazione della PWA, condiviso: il prompt di Chrome (`beforeinstallprompt`)
 * può arrivare prima che il banner sia montato, quindi lo catturiamo appena il modulo si carica.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sj-install-dismissed-until";
const DISMISS_DAYS = 30;

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // niente mini-infobar di Chrome: usiamo il nostro banner
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export type InstallState = {
  /** Già aperta come app (dalla Home). */
  standalone: boolean;
  /** Chrome/Edge/Android: c'è il prompt nativo. */
  canPrompt: boolean;
  /** iPhone/iPad: istruzioni manuali. */
  ios: boolean;
  /** iOS ma non Safari (Chrome iOS, browser interni): bisogna prima aprire in Safari. */
  iosNotSafari: boolean;
  dismissed: boolean;
};

let snapshot: InstallState | null = null;

function compute(): InstallState {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    installed ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return {
    standalone,
    canPrompt: deferred !== null,
    ios,
    iosNotSafari: ios && /CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Line\//.test(ua),
    dismissed: until > Date.now(),
  };
}

export function subscribe(cb: () => void) {
  const l = () => {
    snapshot = null;
    cb();
  };
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot(): InstallState {
  snapshot ??= compute();
  return snapshot;
}

const SERVER: InstallState = { standalone: true, canPrompt: false, ios: false, iosNotSafari: false, dismissed: true };
export const getServerSnapshot = () => SERVER;

export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  emit();
  return outcome === "accepted";
}

export function dismissInstall() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  emit();
}
