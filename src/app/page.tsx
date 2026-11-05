import { Avatar } from "@design/Avatar";
import { PaperGrain } from "@design/PaperGrain";
import { Stamp, type StampIcon } from "@design/Stamp";
import { GIRL_COLORS, girlAvatar, girlInk } from "@design/girls";

/** Segnaposto della Fase 0: verifica token, font, timbro, grana e dark mode. */

const LEGEND: { label: string; icon: StampIcon; rot: number }[] = [
  { label: "C***o", icon: "peperoncino", rot: -6 },
  { label: "Vaff***", icon: "aeroplano", rot: 5 },
  { label: "M***a", icon: "nuvola", rot: -3 },
  { label: "S****o", icon: "bomba", rot: 8 },
  { label: "Bestemmia", icon: "fulmine", rot: -9 },
  { label: "Altro", icon: "asterisco", rot: 4 },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex w-full max-w-[390px] flex-1 flex-col overflow-hidden">
      <PaperGrain />

      <div className="relative z-10 flex flex-col gap-8 px-5 pt-[54px] pb-12">
        <header className="flex flex-col gap-4">
          <Stamp icon="asterisco" size={88} rot={-12} />
          <h1 className="font-display text-[40px] leading-[1.05]">Swear Jar</h1>
          <p className="text-[15px] leading-snug text-muted">
            Ogni parolaccia è un timbro. Ogni 10 timbri, una penitenza.
          </p>
          <span className="receipt text-[13px] text-red">Cantiere aperto · Fase 0</span>
        </header>

        <section aria-labelledby="legenda" className="flex flex-col gap-3">
          <h2 id="legenda" className="receipt text-[12px] text-muted">
            Legenda
          </h2>
          <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
            {LEGEND.map((w) => (
              <li key={w.icon} className="flex flex-col items-center gap-2">
                <Stamp icon={w.icon} size={56} rot={w.rot} />
                <span className="text-[13px] font-bold">{w.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="inchiostri" className="flex flex-col gap-3">
          <h2 id="inchiostri" className="receipt text-[12px] text-muted">
            L&apos;inchiostro di ognuna
          </h2>
          <ul className="flex justify-between">
            {GIRL_COLORS.map((c, i) => (
              <li key={c} className="flex items-center">
                <Avatar initial={c[0].toUpperCase()} color={girlAvatar(c)} size={36} leader={i === 0} />
                <div className="-ml-1.5">
                  <Stamp icon={LEGEND[i].icon} color={girlInk(c)} size={34} rot={LEGEND[i].rot * 2} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex h-14 items-center justify-center gap-2.5 self-center rounded-fab bg-red pr-6 pl-[18px] text-base font-extrabold text-on-red shadow-fab">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.5 3h5a1 1 0 0 1 1 1v3.2a2 2 0 0 1-1 1.7V11h4a2 2 0 0 1 2 2v3H3.5v-3a2 2 0 0 1 2-2h4V8.9a2 2 0 0 1-1-1.7V4a1 1 0 0 1 1-1z" />
            <path d="M4 20h16" />
          </svg>
          <span>Ho detto una parolaccia</span>
        </div>
      </div>
    </main>
  );
}
