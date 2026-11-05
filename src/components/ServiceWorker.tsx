"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
// Importato qui per catturare `beforeinstallprompt` il prima possibile.
import "@/lib/install";

/** Registra /serwist/sw.js. Spento in sviluppo per non vedere versioni vecchie in cache. */
export function ServiceWorker({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      cacheOnNavigation
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
