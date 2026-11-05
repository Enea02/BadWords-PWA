"use client";

import { useId, useMemo, useState } from "react";
import type { GirlColor } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "../board/Sheets";
import { removeMember, resetMemberPassword } from "./actions";
import { ConfirmSheet, Section, iconButton, listBox } from "./shared";

export type Member = {
  id: string;
  name: string;
  color: GirlColor;
  avatarUrl: string | null;
  role: "admin" | "member";
  /** Entrata negli ultimi 7 giorni (calcolato sul server). */
  recent: boolean;
};

/** Board Admin · Membri. Per le member è in sola lettura. */
export function Members({ meId, isAdmin, initial }: { meId: string; isAdmin: boolean; initial: Member[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState(initial);
  const [menu, setMenu] = useState<Member | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);

  const roleLine = (m: Member) =>
    [m.role === "admin" ? "Admin" : "Membro", m.id === meId ? "tu" : null, m.recent ? "entrata di recente" : null]
      .filter(Boolean)
      .join(" · ");

  return (
    <Section id="sj-mem" title="Membri">
      <ul className={listBox}>
        {members.map((m, i) => (
          <li key={m.id} className={`flex h-[60px] items-center gap-3 pr-1.5 pl-3.5 ${i ? "border-t border-dashed border-line" : ""}`}>
            <GirlAvatar name={m.name} color={m.color} avatarUrl={m.avatarUrl} size={36} leader={false} />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[15px] font-bold">{m.name}</span>
              <span className="text-xs text-muted">{roleLine(m)}</span>
            </div>
            {isAdmin && m.id !== meId && (
              <button type="button" aria-label={`Altre azioni per ${m.name}`} className={iconButton} onClick={() => setMenu(m)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <circle cx="5.5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="18.5" cy="12" r="1.8" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {menu && (
        <MemberMenu
          member={menu}
          onClose={() => setMenu(null)}
          onToggleRole={async () => {
            const role = menu.role === "admin" ? "member" : "admin";
            const { data, error } = await supabase.from("profiles").update({ role }).eq("id", menu.id).select("id");
            if (error || !data?.length)
              return error?.code === "23514" ? "Il gruppo deve avere almeno un'admin." : "Non riuscito: riprova.";
            setMembers((ms) => ms.map((x) => (x.id === menu.id ? { ...x, role } : x)));
            setMenu({ ...menu, role });
          }}
          onRemove={() => {
            setConfirmRemove(menu);
            setMenu(null);
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmSheet
          title={`Rimuovere ${confirmRemove.name}?`}
          body={
            <>
              Il suo account viene cancellato insieme ai suoi timbri e alle sue penitenze del mese in corso. Lo Storico dei
              mesi chiusi resta com&apos;è. Non si può annullare.
            </>
          }
          confirmLabel={`Rimuovi ${confirmRemove.name}`}
          onClose={() => setConfirmRemove(null)}
          onConfirm={async () => {
            const res = await removeMember(confirmRemove.id);
            if (res.error) return res.error;
            setMembers((ms) => ms.filter((x) => x.id !== confirmRemove.id));
          }}
        />
      )}
    </Section>
  );
}

function MemberMenu({
  member,
  onToggleRole,
  onRemove,
  onClose,
}: {
  member: Member;
  onToggleRole: () => Promise<string | void>;
  onRemove: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const action = "flex h-[52px] w-full items-center gap-3 rounded-card border-[1.5px] border-line bg-paper px-4 text-left text-[15px] font-bold disabled:opacity-50";

  return (
    <Sheet onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center gap-3">
        <GirlAvatar name={member.name} color={member.color} avatarUrl={member.avatarUrl} size={40} />
        <div className="flex flex-col">
          <h2 id={titleId} className="font-display text-2xl leading-[1.1]">
            {member.name}
          </h2>
          <span className="text-[13px] text-muted">{member.role === "admin" ? "Admin" : "Membro"}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        className={action}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const err = await onToggleRole();
          setBusy(false);
          if (err) setError(err);
        }}
      >
        {member.role === "admin" ? "Togli admin" : "Rendi admin"}
      </button>

      {password ? (
        <div className="flex flex-col gap-2 rounded-card border-2 border-dashed border-red bg-paper p-4" role="status">
          <span className="text-sm">Password provvisoria di {member.name} (si vede solo ora):</span>
          <span className="font-receipt text-2xl font-bold tracking-[0.08em] select-all">{password}</span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(password);
              setCopied(true);
            }}
            className="h-11 rounded-button bg-red text-sm font-extrabold text-on-red"
          >
            {copied ? "Copiata" : "Copia"}
          </button>
          <span className="text-xs text-muted">Mandala a {member.name}: poi la cambia da Gruppo → Il tuo account.</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          className={action}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await resetMemberPassword(member.id);
            setBusy(false);
            if (res.error) setError(res.error);
            else setPassword(res.password!);
          }}
        >
          Reimposta password
        </button>
      )}

      <button type="button" className={`${action} border-red text-red`} onClick={onRemove}>
        Rimuovi dal gruppo
      </button>

      {error && (
        <p role="alert" className="text-sm font-bold text-red">
          {error}
        </p>
      )}
      <button type="button" onClick={onClose} className="h-[50px] rounded-card border-[1.5px] border-ink text-[15px] font-bold text-ink">
        Chiudi
      </button>
    </Sheet>
  );
}
