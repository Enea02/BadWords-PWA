import { useId } from "react";

/** Logo "#@!" a timbro, con la scritta sull'arco. Dalla board Login. */
export function LogoStamp({ size = 188 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  const filterId = `sj-ink-logo-${id}`;
  const arcId = `sj-arc-logo-${id}`;

  return (
    <div className="self-center" style={{ width: size, height: size, transform: "rotate(-7deg)" }}>
      <svg
        viewBox="0 0 236 236"
        width={size}
        height={size}
        role="img"
        aria-label="Logo Swear Jar"
        className="block text-red"
        style={{ mixBlendMode: "var(--sj-stamp-blend)" as React.CSSProperties["mixBlendMode"] }}
      >
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves={1} seed={5} result="s" />
          <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.15" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
        <defs>
          <path id={arcId} d="M118,118 m-90,0 a90,90 0 1,1 180,0 a90,90 0 1,1 -180,0" />
        </defs>
        <g filter={`url(#${filterId})`} fill="none" stroke="currentColor">
          <circle cx="118" cy="118" r="113" strokeWidth="5" />
          <circle cx="118" cy="118" r="104" strokeWidth="1.6" />
          <circle cx="118" cy="118" r="72" strokeWidth="2.4" />
          <text className="font-display" fontSize="18" fill="currentColor" stroke="none" letterSpacing="2">
            <textPath href={`#${arcId}`} textLength="560" lengthAdjust="spacing">
              SWEAR JAR • OGNI PAROLACCIA UN TIMBRO •
            </textPath>
          </text>
          <text x="118" y="136" textAnchor="middle" className="font-display" fontSize="54" fill="currentColor" stroke="none">
            #@!
          </text>
        </g>
      </svg>
    </div>
  );
}
