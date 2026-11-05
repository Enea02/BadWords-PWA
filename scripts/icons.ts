/**
 * Genera le icone della PWA dal timbro asterisco (stessi tracciati e filtro di design/Stamp.tsx)
 * su un quadrato color carta (senza grana: a queste dimensioni non si vede e gonfia i PNG). Uso: `pnpm icons` (Node 24, TypeScript nativo).
 */
import { rmSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { LITERAL } from "../design/tokens.ts";

/** `scale` = lato del timbro rispetto all'icona. Maskable: ≤ 0.62 per stare nella safe zone (cerchio 80%). */
function iconSvg(size: number, scale: number, rot = -12) {
  const stamp = size * scale;
  const off = (size - stamp) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <filter id="ink" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" result="s"/>
    <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.05" result="m"/>
    <feComposite in="d" in2="m" operator="in"/>
  </filter>
  <rect width="100%" height="100%" fill="${LITERAL.paperLight}"/>
  <g transform="translate(${off} ${off}) scale(${stamp / 48}) rotate(${rot} 24 24)" opacity="0.94"
     fill="none" stroke="${LITERAL.redLight}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <g filter="url(#ink)">
      <circle cx="24" cy="24" r="21.5" stroke-width="2.4"/>
      <circle cx="24" cy="24" r="18" stroke-width="1" stroke-dasharray="1.4 2.2"/>
      <path d="M24 14 V34" stroke-width="3.2"/>
      <path d="M15.3 19 L32.7 29" stroke-width="3.2"/>
      <path d="M15.3 29 L32.7 19" stroke-width="3.2"/>
    </g>
  </g>
</svg>`;
}

function png(svg: string, size: number) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

const out: [string, number, number][] = [
  ["public/icons/icon-192.png", 192, 0.84],
  ["public/icons/icon-512.png", 512, 0.84],
  ["public/icons/maskable-512.png", 512, 0.6],
  ["src/app/apple-icon.png", 180, 0.78], // iOS arrotonda gli angoli da sé
  ["src/app/icon.png", 64, 0.92], // favicon
];

for (const [file, size, scale] of out) {
  writeFileSync(file, png(iconSvg(512, scale), size));
  console.log("✓", file);
}
rmSync("src/app/favicon.ico", { force: true });
