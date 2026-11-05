"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const Icon = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Tabellone",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9.5h18" />
        <path d="M9 9.5V20" />
      </>
    ),
  },
  {
    href: "/penitenze",
    label: "Penitenze",
    icon: (
      <>
        <path d="M3.5 7h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z" />
        <path d="M14.5 7.5v1.5" />
        <path d="M14.5 11.25v1.5" />
        <path d="M14.5 15v1.5" />
      </>
    ),
  },
  {
    href: "/storico",
    label: "Storico",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    href: "/gruppo",
    label: "Gruppo",
    icon: (
      <>
        <path d="M4 7h9" />
        <path d="M17 7h3" />
        <path d="M4 17h3" />
        <path d="M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
  },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Barra in basso (mobile), come nella board Main. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[84px] grid-cols-4 border-t-[1.5px] border-line bg-card px-2 pt-1.5 pb-6 lg:hidden"
      style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      {ITEMS.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-[3px] text-[11px] ${active ? "font-extrabold text-red" : "font-semibold text-muted"}`}
          >
            <Icon>{it.icon}</Icon>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Voci della barra laterale (desktop), come nella board Desktop. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni" className="flex flex-col gap-1">
      {ITEMS.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] ${active ? "bg-alert-bg font-extrabold text-alert-ink" : "font-semibold text-ink hover:bg-card2"}`}
          >
            <Icon size={20}>{it.icon}</Icon>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
