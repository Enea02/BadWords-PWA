"use client";

import { deletePushSubscription, savePushSubscription, type SubscriptionJSON } from "@/lib/pushActions";

/**
 * Stato delle notifiche push su QUESTO dispositivo, condiviso tra l'interruttore in Gruppo
 * e la card sul tabellone.
 */
export type PushState =
  | "loading"
  | "unsupported" // browser senza Web Push
  | "needs-install" // iPhone/iPad: funzionano solo dall'app aggiunta alla Home
  | "no-sw" // service worker assente (es. `pnpm dev`)
  | "denied" // permesso negato nelle impostazioni
  | "off"
  | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

let state: PushState = "loading";
let synced = false;
const listeners = new Set<() => void>();
const set = (s: PushState) => {
  state = s;
  listeners.forEach((l) => l());
};

export function subscribePush(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1 && state === "loading") void refresh();
  return () => listeners.delete(cb);
}
export const getPushState = () => state;
export const getPushServerState = (): PushState => "loading";

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && VAPID !== "";
}

function isIosBrowser() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 5000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function refresh() {
  if (isIosBrowser()) return set("needs-install");
  if (!supported()) return set("unsupported");
  if (Notification.permission === "denied") return set("denied");
  const reg = await registration();
  if (!reg) return set("no-sw");
  const sub = await reg.pushManager.getSubscription();
  if (sub && Notification.permission === "granted") {
    // Una volta per sessione riallinea il server (iscrizione rinnovata, telefono passato a un'altra).
    if (!synced) {
      synced = true;
      void savePushSubscription(sub.toJSON() as SubscriptionJSON);
    }
    return set("on");
  }
  set("off");
}

/** Chiede il permesso e iscrive il dispositivo. Va chiamata da un tap. */
export async function enablePush(): Promise<{ error?: string }> {
  if (!supported()) return { error: "Questo browser non supporta le notifiche." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    set(permission === "denied" ? "denied" : "off");
    return permission === "denied" ? {} : { error: "Serve il permesso per mandarti le notifiche." };
  }
  const reg = await registration();
  if (!reg) {
    set("no-sw");
    return {};
  }
  try {
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID) }));
    const { ok } = await savePushSubscription(sub.toJSON() as SubscriptionJSON);
    if (!ok) {
      await sub.unsubscribe();
      set("off");
      return { error: "Non riuscito: riprova." };
    }
    synced = true;
    set("on");
    return {};
  } catch {
    set("off");
    return { error: "Non riuscito: riprova." };
  }
}

/** Disiscrive questo dispositivo (anche all'uscita, per non avvisare chi entra dopo sullo stesso telefono). */
export async function disablePush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  if (state !== "loading") set(supported() ? "off" : state);
}

function base64UrlToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
