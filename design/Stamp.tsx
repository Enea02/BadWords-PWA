/**
 * Timbro di gomma: 6 icone + filtro inchiostro.
 * Port 1:1 di `Stamp.dc.html` (artifact "Swear Jar"). Non modificare la grafica.
 *
 * L'unica differenza: ogni SVG ha un id di filtro univoco (useId) invece di
 * "sj-ink" ripetuto, così più timbri nella stessa pagina non si pestano.
 */
import { useId, type CSSProperties } from "react";

export const STAMP_ICONS = [
  "peperoncino",
  "aeroplano",
  "nuvola",
  "bomba",
  "fulmine",
  "asterisco",
] as const;

export type StampIcon = (typeof STAMP_ICONS)[number];

export type StampProps = {
  icon?: StampIcon;
  /** Qualsiasi colore CSS: usa sempre un token, es. "var(--sj-red)". */
  color?: string;
  /** Lato in px (12–320). */
  size?: number;
  /** Rotazione in gradi (-45…45). */
  rot?: number;
  /** Doppio anello attorno all'icona. */
  ring?: boolean;
  /** Di default segue il tema (multiply su chiaro, screen su scuro). */
  blend?: "multiply" | "screen" | "normal";
  opacity?: number;
  className?: string;
  style?: CSSProperties;
};

function Glyph({ icon }: { icon: StampIcon }) {
  switch (icon) {
    case "peperoncino":
      return (
        <>
          <path
            d="M18.5 21 C18 28 23 33.5 31.5 33.5 C33 33.5 33.3 31.8 32 31.2 C27.5 29 26 25.5 26 21 Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M18.5 21 C19.5 18.8 25 18.8 26 21" />
          <path d="M22.2 19.3 C22 16.5 23.5 14.8 26.5 14.5" />
        </>
      );
    case "aeroplano":
      return (
        <>
          <path d="M14 24.5 L34 15 L29 33 L23.5 27.5 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M23.5 27.5 L34 15" />
          <path d="M23.5 27.5 V32.5 L26.4 30.1" />
        </>
      );
    case "nuvola":
      return (
        <>
          <path
            d="M17 25.5 H31 A4.5 4.5 0 0 0 31.6 16.6 A6.5 6.5 0 0 0 19.3 17.6 A4 4 0 0 0 17 25.5 Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M25.2 27.5 L22.6 31.6 H26.2 L24 35.6" />
          <path d="M19 29 L18 31.5" />
          <path d="M30.5 29 L29.5 31.5" />
        </>
      );
    case "bomba":
      return (
        <>
          <circle cx="22" cy="27" r="8" fill="currentColor" fillOpacity="0.2" />
          <path d="M27.4 19.6 L29.4 17.6 L31.4 19.6 L29.4 21.6 Z" />
          <path d="M30.4 18.6 C31.4 16.2 32.8 15.6 34.2 14.6" />
          <path d="M36 12.6 L37.4 11.2" />
          <path d="M36.4 15.2 H38.2" />
          <path d="M34.2 11.2 V9.6" />
          <path d="M17.8 25.4 A4.6 4.6 0 0 1 20.6 22.4" />
        </>
      );
    case "fulmine":
      return (
        <path
          d="M26.5 12.5 L17.5 26.2 H23.6 L21.6 35.5 L31 21.4 H25 Z"
          fill="currentColor"
          fillOpacity="0.2"
        />
      );
    case "asterisco":
      return (
        <>
          <path d="M24 14 V34" strokeWidth="3.2" />
          <path d="M15.3 19 L32.7 29" strokeWidth="3.2" />
          <path d="M15.3 29 L32.7 19" strokeWidth="3.2" />
        </>
      );
  }
}

export function Stamp({
  icon = "peperoncino",
  color = "var(--sj-red)",
  size = 64,
  rot = -6,
  ring = true,
  blend,
  opacity = 0.94,
  className,
  style,
}: StampProps) {
  const filterId = `sj-ink-${useId().replace(/:/g, "")}`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        color,
        transform: `rotate(${rot}deg)`,
        opacity,
        mixBlendMode: (blend ?? "var(--sj-stamp-blend)") as CSSProperties["mixBlendMode"],
        flexShrink: 0,
        display: "block",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <filter id={filterId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="1.6"
            xChannelSelector="R"
            yChannelSelector="G"
            result="d"
          />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves={1} seed={9} result="s" />
          <feColorMatrix
            in="s"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.05"
            result="m"
          />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
        <g filter={`url(#${filterId})`}>
          <g opacity={ring ? 1 : 0}>
            <circle cx="24" cy="24" r="21.5" strokeWidth="2.4" />
            <circle cx="24" cy="24" r="18" strokeWidth="1" strokeDasharray="1.4 2.2" />
          </g>
          <Glyph icon={icon} />
        </g>
      </svg>
    </div>
  );
}

export default Stamp;
