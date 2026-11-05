import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { PaperGrain } from "@design/PaperGrain";

/** Schermata mobile su carta: 390 px di riferimento, centrata su schermi più larghi. */
export function PaperScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden">
      <PaperGrain />
      <div className={`relative z-10 flex flex-1 flex-col px-6 pb-10 ${className}`}>{children}</div>
    </main>
  );
}

const primary =
  "flex h-14 w-full items-center justify-center gap-2 rounded-fab bg-red text-[17px] font-extrabold text-on-red " +
  "shadow-[0_4px_0_var(--sj-red-shadow)] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_var(--sj-red-shadow)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0";

export function PrimaryButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="submit" className={`${primary} ${className}`} {...rest}>
      {children}
    </button>
  );
}

const textLink =
  "flex min-h-11 items-center self-center text-[15px] font-bold text-red underline underline-offset-[3px] hover:text-red-shadow";

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={textLink}>
      {children}
    </Link>
  );
}

export function TextButton({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={textLink} {...rest}>
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string };

export function TextField({ label, id, hint, className = "", ...rest }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={
          "h-14 rounded-card border-[1.5px] border-ink bg-card px-4 text-[17px] text-ink outline-none " +
          "placeholder:text-muted focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
          className
        }
        {...rest}
      />
      {hint && (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-center text-sm font-bold text-red">
      {message}
    </p>
  );
}

/** "Passo N di 2" + le due barrette. */
export function StepHeader({ step, back }: { step: 1 | 2; back?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {back && (
        <button
          type="button"
          onClick={back}
          aria-label="Indietro"
          className="-my-3 -ml-3 flex size-11 items-center justify-center text-ink"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </svg>
        </button>
      )}
      <span className="receipt text-[13px] tracking-[0.1em] text-muted">Passo {step} di 2</span>
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="h-1.5 w-8 rounded-full bg-red" />
        <div className={`h-1.5 w-8 rounded-full ${step === 2 ? "bg-red" : "bg-card2"}`} />
      </div>
    </div>
  );
}

export function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
