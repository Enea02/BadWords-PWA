"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; id: string; hint?: string };

/** Campo password con l'occhio per vederla in chiaro. Stesso stile di TextField. */
export function PasswordField({ label, id, hint, className = "", ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={
            "h-14 w-full rounded-card border-[1.5px] border-ink bg-card pr-14 pl-4 text-[17px] text-ink outline-none " +
            "placeholder:text-muted focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
            className
          }
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Nascondi password" : "Mostra password"}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-cell text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-red"
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}

const Eye = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7" />
    <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.4 9.4 0 0 0 4.4-1.1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
