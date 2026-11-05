import Image from "next/image";

/**
 * Il logo (dinosauro "Bad Words") in piccolo: header, barra laterale, banner.
 * Decorativo di default (accanto c'è già il nome dell'app); passa `alt` se è da solo.
 */
export function BrandLogo({ size, alt = "", className = "" }: { size: number; alt?: string; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
