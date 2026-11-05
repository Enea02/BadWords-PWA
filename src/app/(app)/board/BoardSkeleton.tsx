"use client";

import type { Girl, Word } from "@/lib/board";
import { BoardGrid } from "./BoardGrid";
import { BrandLogo } from "@/components/BrandLogo";

const GIRLS: Girl[] = Array.from({ length: 5 }, (_, i) => ({
  id: `s${i}`,
  name: "",
  color: "fucsia",
  avatarUrl: null,
  role: "member",
}));
const WORDS: Word[] = (["peperoncino", "aeroplano", "nuvola", "bomba", "fulmine", "asterisco"] as const).map((icon, i) => ({
  id: `w${i}`,
  label: "",
  icon,
}));

/** Stato "Caricamento" della board: skeleton che pulsa. */
export function BoardSkeleton() {
  return (
    <div className="flex h-dvh flex-col lg:h-auto lg:px-[clamp(16px,3vw,40px)] lg:pt-8" aria-busy="true">
      <header className="flex flex-col gap-1.5 px-5 pt-[54px] lg:p-0">
        <div className="flex items-center gap-2 lg:hidden">
          <BrandLogo size={32} />
          <span className="font-display text-base text-red">Bad Words</span>
        </div>
        <div className="mt-1.5 h-[42px] w-48 anim-pulse rounded-md bg-card2 lg:mt-0 lg:h-12" />
        <p className="text-[13px] text-muted">Aggiorno il tabellone…</p>
      </header>
      <div className="mt-3.5 overflow-hidden lg:mt-6 lg:rounded-cell lg:bg-card">
        <BoardGrid
          girls={GIRLS}
          words={WORDS}
          counts={{}}
          totals={[]}
          leaders={new Set()}
          fresh={null}
          disabled
          loading
          desktop={false}
          onTap={() => {}}
          onDetails={() => {}}
        />
      </div>
    </div>
  );
}
