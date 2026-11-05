import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Revisione della pagina offline precaricata: il commit corrente (o un uuid se git non c'è, es. su Vercel senza .git).
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  crypto.randomUUID();

/** Compila e serve il service worker su /serwist/sw.js (Serwist per Turbopack). */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  // Icone (solo per l'installazione) e logo originale (la login usa la versione ottimizzata): niente precache.
  globIgnores: ["**/icons/**", "**/logo.png"],
  useNativeEsbuild: true,
});
