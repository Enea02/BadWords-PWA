import { Avatar } from "@design/Avatar";
import { Stamp, STAMP_ICONS, type StampIcon } from "@design/Stamp";
import { girlAvatar, type GirlColor } from "@design/girls";

/**
 * Avatar di una ragazza secondo profiles.avatar_url:
 * null → iniziale; "icon:<icona>" → timbro chiaro su fondo colore; URL → foto.
 */
export function GirlAvatar({
  name,
  color,
  avatarUrl,
  size = 36,
  leader = false,
}: {
  name: string;
  color: GirlColor;
  avatarUrl: string | null;
  size?: number;
  leader?: boolean;
}) {
  const bg = girlAvatar(color);
  const ring = leader ? { outline: "2.5px solid var(--sj-gold)", outlineOffset: 2 } : {};

  const icon = avatarUrl?.startsWith("icon:") ? (avatarUrl.slice(5) as StampIcon) : null;
  if (icon && STAMP_ICONS.includes(icon)) {
    return (
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, background: bg, ...ring }}
      >
        <Stamp icon={icon} color="var(--sj-on-avatar)" size={Math.round(size * 0.82)} rot={0} ring={false} blend="normal" opacity={1} />
      </div>
    );
  }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto da Supabase Storage, già 256px
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, background: bg, ...ring }}
      />
    );
  }

  return <Avatar initial={name.trim().charAt(0).toUpperCase() || "?"} color={bg} size={size} leader={leader} />;
}
