/**
 * Logo e icone della PWA dal logo "Bad Words" (design/brand/dinosauro-bad-words.png).
 * Uso: `pnpm icons` (Node 24, TypeScript nativo).
 *
 * 1. Toglie lo sfondo bianco ESTERNO (flood fill dai bordi): il bianco dentro il cartello resta.
 * 2. public/logo.png: logo trasparente 640 px per la pagina di login.
 * 3. Icone su quadrato color carta: 192, 512, maskable 512 (safe zone), apple-touch-icon, favicon.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import { LITERAL } from "../design/tokens.ts";

const SRC = "design/brand/dinosauro-bad-words.png";

// ─────────────── 1. Sfondo esterno trasparente ───────────────
const img = PNG.sync.read(readFileSync(SRC));
const { width: W, height: H, data } = img;
const NEAR_WHITE = 232; // soglia per "sfondo"
const isBg = (i: number) => data[i] >= NEAR_WHITE && data[i + 1] >= NEAR_WHITE && data[i + 2] >= NEAR_WHITE;

const seen = new Uint8Array(W * H);
const stack: number[] = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop()!;
  if (seen[p]) continue;
  seen[p] = 1;
  if (!isBg(p * 4)) continue;
  data[p * 4 + 3] = 0;
  const x = p % W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (p >= W) stack.push(p - W);
  if (p < W * (H - 1)) stack.push(p + W);
}
// Bordo morbido: i pixel chiari a contatto con lo sfondo tolto diventano semitrasparenti (niente alone bianco).
const alpha = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) alpha[p] = data[p * 4 + 3];
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (alpha[p] === 0) continue;
    const touches = alpha[p - 1] === 0 || alpha[p + 1] === 0 || alpha[p - W] === 0 || alpha[p + W] === 0;
    if (!touches) continue;
    const lum = (data[p * 4] + data[p * 4 + 1] + data[p * 4 + 2]) / 3;
    data[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (255 - lum) / (255 - 180))));
  }
}
const transparent = PNG.sync.write(img);
const dataUri = `data:image/png;base64,${transparent.toString("base64")}`;

// ─────────────── 2 e 3. Rendering ───────────────
/** `scale` = lato del logo rispetto al quadrato; `bg` = colore di sfondo o null (trasparente). */
function render(size: number, scale: number, bg: string | null) {
  const side = 1024;
  const logo = side * scale;
  const off = (side - logo) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">
  ${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ""}
  <image x="${off}" y="${off}" width="${logo}" height="${logo}" xlink:href="${dataUri}"/>
</svg>`;
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

const out: [string, number, number, string | null][] = [
  ["public/logo.png", 640, 1, null],
  ["public/icons/icon-192.png", 192, 0.94, LITERAL.paperLight],
  ["public/icons/icon-512.png", 512, 0.94, LITERAL.paperLight],
  ["public/icons/maskable-512.png", 512, 0.72, LITERAL.paperLight], // safe zone: cerchio dell'80%
  ["src/app/apple-icon.png", 180, 0.9, LITERAL.paperLight], // iOS arrotonda gli angoli da sé
  ["src/app/icon.png", 64, 1, null], // favicon trasparente
];

for (const [file, size, scale, bg] of out) {
  writeFileSync(file, render(size, scale, bg));
  console.log("✓", file);
}
