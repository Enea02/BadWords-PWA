"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { acknowledgePenance, fetchPenance, type PenanceItem } from "@/lib/penances";
import { stampedRecently } from "@/lib/stampBus";
import { createClient } from "@/lib/supabase/client";
import { PenanceReveal } from "./PenanceReveal";

type Member = { id: string; name: string };

/**
 * In ogni pagina dell'area protetta: quando scatta una penitenza piccola
 * - l'interessata vede la schermata a tutto schermo (anche se era offline: alla prossima apertura);
 * - chi ha messo il timbro decisivo la vede anche lei;
 * - le altre ricevono un toast.
 */
export function PenanceWatcher({
  meId,
  groupId,
  timezone,
  members,
}: {
  meId: string;
  groupId: string;
  timezone: string;
  members: Member[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [queue, setQueue] = useState<PenanceItem[]>([]);
  const [news, setNews] = useState<string | null>(null);
  const nameOf = useCallback((id: string) => members.find((m) => m.id === id)?.name ?? "Qualcuna", [members]);

  const enqueue = useCallback(
    (p: PenanceItem) => setQueue((q) => (q.some((x) => x.id === p.id) ? q : [...q, p])),
    [],
  );

  // Penitenze mie non ancora viste (es. scattate mentre ero offline).
  useEffect(() => {
    supabase
      .from("penance_assignments")
      .select("id")
      .eq("profile_id", meId)
      .eq("kind", "small")
      .is("acknowledged_at", null)
      .order("created_at")
      .then(async ({ data }) => {
        for (const r of data ?? []) {
          const p = await fetchPenance(supabase, r.id);
          if (p) enqueue(p);
        }
      });
  }, [supabase, meId, enqueue]);

  useEffect(() => {
    const channel = supabase
      .channel(`penances:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "penance_assignments", filter: `group_id=eq.${groupId}` },
        async ({ new: row }) => {
          const r = row as { id: string; profile_id: string; kind: string };
          if (r.kind !== "small") return; // la grossa del mese la mostra la schermata Fine mese
          if (r.profile_id === meId || stampedRecently(r.profile_id)) {
            const p = await fetchPenance(supabase, r.id);
            if (p) enqueue(p);
          } else {
            setNews(`${nameOf(r.profile_id)} ha sbloccato una penitenza`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, groupId, meId, enqueue, nameOf]);

  useEffect(() => {
    if (!news) return;
    const t = setTimeout(() => setNews(null), 6000);
    return () => clearTimeout(t);
  }, [news]);

  const current = queue[0];

  return (
    <>
      {current && (
        <PenanceReveal
          key={current.id}
          penance={current}
          name={nameOf(current.profileId)}
          mine={current.profileId === meId}
          timezone={timezone}
          onAccept={() => {
            const mine = current.profileId === meId;
            if (mine) acknowledgePenance(supabase, current.id);
            setQueue((q) => q.slice(1));
            if (mine && queue.length === 1) router.push("/penitenze");
          }}
        />
      )}
      {news &&
        createPortal(
          <div
            role="status"
            className="fixed inset-x-4 top-[max(12px,env(safe-area-inset-top))] z-40 flex min-h-12 items-center gap-3 rounded-card bg-toast-bg px-4 py-2 text-toast-ink shadow-toast anim-toast lg:inset-x-auto lg:right-6 lg:w-[380px]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-toast-accent">
              <path d="M3.5 7h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z" />
              <path d="M14.5 7.5v1.5" />
              <path d="M14.5 11.25v1.5" />
              <path d="M14.5 15v1.5" />
            </svg>
            <span className="flex-1 text-sm font-bold">{news}</span>
            <button
              type="button"
              onClick={() => {
                setNews(null);
                router.push("/penitenze");
              }}
              className="h-11 shrink-0 px-2 text-sm font-extrabold text-toast-accent underline underline-offset-2"
            >
              Vedi
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
