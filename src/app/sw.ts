/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Cache delle pagine (HTML e RSC): il tabellone già aperto resta leggibile offline. */
const PAGES_CACHE = "pages";

const runtimeCaching: RuntimeCaching[] = [
  // Supabase (dati, auth, storage): mai in cache. Le chiavi della Cache API ignorano
  // l'utente, e i dati devono essere sempre freschi o assenti.
  {
    matcher: ({ url }) => url.hostname.endsWith(".supabase.co") || url.port === "55321",
    handler: new NetworkOnly(),
  },
  // Le rotte cron e i service worker stessi non vanno mai in cache.
  { matcher: ({ url }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/serwist/"), handler: new NetworkOnly() },
  // Pagine: rete prima (dati freschi), cache se la rete non risponde entro 3 s.
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && (request.mode === "navigate" || request.headers.get("RSC") === "1"),
    handler: new NetworkFirst({ cacheName: PAGES_CACHE, networkTimeoutSeconds: 3 }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// ─────────────── Notifiche push (payload da src/lib/push.server.ts) ───────────────
type PushPayload = { title?: string; body?: string; url?: string; tag?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Bad Words", {
      body: data.body,
      icon: "/icons/icon-192.png",
      tag: data.tag,
      lang: "it",
      data: { url: data.url ?? "/" },
    }),
  );
});

// Al tocco: porta in primo piano l'app già aperta sulla pagina giusta, altrimenti la apre.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data as { url?: string } | null)?.url ?? "/";
  const url = new URL(path.startsWith("/") ? path : "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        if (client.url !== url) await client.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
