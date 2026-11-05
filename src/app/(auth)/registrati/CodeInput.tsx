"use client";

import { useRef } from "react";

const ROTS = [-2, 1.5, -1, 2, -1.5, 1];
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** 6 caselle per il codice invito, leggermente storte come nella board. Incolla il codice intero. */
export function CodeInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setFrom = (index: number, text: string) => {
    const next = chars.slice();
    const add = clean(text).split("");
    add.forEach((c, k) => {
      if (index + k < 6) next[index + k] = c;
    });
    const joined = next.join("").slice(0, 6);
    onChange(joined);
    refs.current[Math.min(index + add.length, 5)]?.focus();
  };

  return (
    <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
      <legend className="mb-2.5 p-0 text-sm font-bold">Codice invito</legend>
      <div className="grid grid-cols-6 gap-2">
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            value={ch}
            aria-label={`Carattere ${i + 1} di 6`}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                const next = chars.slice();
                next[i] = "";
                onChange(next.join(""));
              } else {
                setFrom(i, v.slice(ch ? 1 : 0) || v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !ch && i > 0) {
                e.preventDefault();
                const next = chars.slice();
                next[i - 1] = "";
                onChange(next.join(""));
                refs.current[i - 1]?.focus();
              }
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              setFrom(i, e.clipboardData.getData("text"));
            }}
            onFocus={(e) => e.target.select()}
            className={
              "h-[60px] w-full min-w-0 rounded-[12px] border-[1.5px] bg-card p-0 text-center font-display text-[28px] text-ink " +
              "outline-none focus-visible:ring-2 focus-visible:ring-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
              (invalid ? "border-red" : "border-ink")
            }
            style={{ transform: `rotate(${ROTS[i]}deg)` }}
          />
        ))}
      </div>
    </fieldset>
  );
}
