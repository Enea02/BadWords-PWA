"use client";

export function ReloadButton() {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-3">
      <button
        type="button"
        onClick={() => location.reload()}
        className="h-14 rounded-fab bg-red text-[17px] font-extrabold text-on-red shadow-[0_4px_0_var(--sj-red-shadow)]"
      >
        Riprova
      </button>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- offline serve un caricamento completo, non la navigazione client */}
      <a href="/" className="min-h-11 content-center text-[15px] font-bold text-red underline underline-offset-[3px]">
        Vai al tabellone
      </a>
    </div>
  );
}
