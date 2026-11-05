/**
 * Avatar con l'iniziale. Port di `Avatar.dc.html`.
 * L'anello oro (outline) segna la leader del mese.
 */
export type AvatarProps = {
  initial: string;
  /** Fondo: usa un token, es. "var(--sj-avatar-magenta)". */
  color: string;
  size?: number;
  leader?: boolean;
  ringColor?: string;
  className?: string;
};

export function Avatar({
  initial,
  color,
  size = 64,
  leader = false,
  ringColor = "var(--sj-gold)",
  className,
}: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={`font-display ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "var(--sj-on-avatar)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.44),
        lineHeight: 1,
        flexShrink: 0,
        boxSizing: "border-box",
        boxShadow:
          "inset 0 0 0 2px color-mix(in srgb, var(--sj-on-avatar) 28%, transparent)",
        outline: leader ? `2.5px solid ${ringColor}` : "0 solid transparent",
        outlineOffset: 2,
      }}
    >
      {initial}
    </div>
  );
}

export default Avatar;
