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
