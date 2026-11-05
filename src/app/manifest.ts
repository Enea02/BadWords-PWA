import type { MetadataRoute } from "next";
import { LITERAL } from "@design/tokens";

/** Manifest della PWA (servito su /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bad Words",
    short_name: "Bad Words",
    description: "La carta fedeltà al contrario: ogni parolaccia è un timbro.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: LITERAL.paperLight,
    theme_color: LITERAL.paperLight,
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
