/**
 * Grana della carta: overlay a tutto schermo, non interattivo.
 * Port 1:1 dell'SVG delle artboard (opacità da --sj-grain: 0.55 chiaro, 0.22 scuro).
 * Mettilo come primo figlio di un contenitore `relative`.
 */
import { useId } from "react";

export function PaperGrain({ className }: { className?: string }) {
  const filterId = `sj-grain-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: "var(--sj-grain)",
      }}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.32  0 0 0 0 0.24  0 0 0 0 0.16  1.3 0 0 0 -0.62" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}

export default PaperGrain;
