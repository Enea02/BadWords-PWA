import "server-only";
import webpush, { WebPushError } from "web-push";
import { serverEnv } from "@/lib/env.server";
import { monthTitle, summarize, type SnapRow } from "@/lib/monthEnd";
import { FALLBACK_TEXT } from "@/lib/penances";
import { createAdminClient } from "@/lib/supabase/admin";

/** Quello che arriva al service worker (src/app/sw.ts). */
export type PushPayload = { title: string; body: string; url: string; tag: string };

type Admin = ReturnType<typeof createAdminClient>;
type Member = { id: string; name: string; role: "admin" | "member" };
type Outgoing = { to: string; payload: PushPayload };

/** Eventi più vecchi di così non si notificano più (es. coda rimasta ferma). */
const MAX_AGE_MS = 2 * 24 * 3600 * 1000;

/**
 * Svuota la coda push_outbox e invia le notifiche. Chiamata dal database (pg_net) a ogni evento
 * e dal cron giornaliero come rete di sicurezza. Ogni evento viene preso in carico una sola volta.
 */
export async function flushPushOutbox() {
  const admin = createAdminClient();
  const vapid = serverEnv.vapid;
  const { data: events, error } = await admin.rpc("claim_push_outbox");
  if (error) throw error;
  if (!events?.length || !vapid) return { events: events?.length ?? 0, sent: 0 };

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const fresh = events.filter((e) => Date.now() - new Date(e.created_at).getTime() < MAX_AGE_MS);
  const outgoing: Outgoing[] = [];
  const membersCache = new Map<string, Member[]>();
  const membersOf = async (groupId: string) => {
    if (!membersCache.has(groupId)) {
      const { data } = await admin.from("profiles").select("id, display_name, role").eq("group_id", groupId);
      membersCache.set(groupId, (data ?? []).map((p) => ({ id: p.id, name: p.display_name, role: p.role })));
    }
    return membersCache.get(groupId)!;
  };

  for (const e of fresh) {
    const members = await membersOf(e.group_id);
    if (e.event === "month_closed" && e.month) {
      const { data } = await admin
        .from("month_closures")
        .select("snapshot")
        .eq("group_id", e.group_id)
        .eq("month", e.month)
        .maybeSingle();
      if (data) outgoing.push(...monthClosedMessages(e.month, data.snapshot as unknown as SnapRow[], members));
    } else if (e.assignment_id) {
      const { data: a } = await admin
        .from("penance_assignments")
        .select("id, profile_id, kind, threshold, custom, custom_text, penance:penances (text)")
        .eq("id", e.assignment_id)
        .maybeSingle();
      if (!a) continue;
      const assignment = { ...a, text: a.custom_text ?? a.penance?.text ?? null };
      outgoing.push(
        ...(e.event === "penance_unlocked"
          ? unlockedMessages(assignment, members)
          : decidedMessages(assignment)),
      );
    }
  }

  return { events: events.length, sent: await deliver(admin, outgoing) };
}

// ─────────────── Testi ───────────────

type Assignment = {
  id: string;
  profile_id: string;
  kind: "small" | "monthly";
  threshold: number | null;
  custom: boolean;
  text: string | null;
};

export function unlockedMessages(a: Assignment, members: Member[]): Outgoing[] {
  const her = members.find((m) => m.id === a.profile_id);
  if (!her) return [];
  const tag = `penance-${a.id}`;
  const quota = `Quota ${a.threshold}`;
  const awaiting = a.custom && !a.text;
  const out: Outgoing[] = [
    {
      to: her.id,
      payload: {
        title: "Penitenza sbloccata!",
        body: awaiting
          ? her.role === "admin"
            ? `${quota}: decidi tu cosa ti tocca, da Penitenze.`
            : `${quota}: l'admin sta decidendo cosa ti tocca.`
          : `${quota}: ${a.text ?? FALLBACK_TEXT}`,
        url: awaiting && her.role === "admin" ? "/penitenze" : "/",
        tag,
      },
    },
  ];
  for (const m of members) {
    if (m.id === her.id) continue;
    out.push({
      to: m.id,
      payload:
        awaiting && m.role === "admin"
          ? { title: `Decidi la penitenza di ${her.name}`, body: `${quota}: scrivila tu.`, url: "/penitenze", tag }
          : { title: `${her.name} ha sbloccato una penitenza`, body: `${quota}.`, url: "/penitenze", tag },
    });
  }
  return out;
}

export function decidedMessages(a: Assignment): Outgoing[] {
  if (!a.text) return [];
  return [
    {
      to: a.profile_id,
      payload: {
        title: a.kind === "monthly" ? "La penitenza del mese è decisa" : "La tua penitenza è decisa",
        body: a.text,
        url: "/penitenze",
        tag: `penance-${a.id}`,
      },
    },
  ];
}

export function monthClosedMessages(month: string, snapshot: SnapRow[], members: Member[]): Outgoing[] {
  const s = summarize(snapshot);
  const title = `${monthTitle(month)} chiuso`;
  const body = s.winners.length
    ? `${s.winners.length > 1 ? "Bocche sporche del mese" : "Bocca sporca del mese"}: ${s.winnerNames} (${s.subtitle}).`
    : "Nessun timbro: mese immacolato!";
  return members.map((m) => ({ to: m.id, payload: { title, body, url: "/", tag: `month-${month}` } }));
}

// ─────────────── Invio ───────────────

async function deliver(admin: Admin, outgoing: Outgoing[]) {
  if (!outgoing.length) return 0;
  const ids = [...new Set(outgoing.map((o) => o.to))];
  const { data: subs } = await admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth").in("profile_id", ids);
  if (!subs?.length) return 0;

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    outgoing.flatMap((o) =>
      subs
        .filter((s) => s.profile_id === o.to)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(o.payload),
              { TTL: 24 * 3600, urgency: "normal", topic: topicOf(o.payload.tag) },
            );
            sent++;
          } catch (err) {
            // 404/410: iscrizione scaduta o revocata dall'utente → si cancella.
            if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) gone.push(s.id);
            else console.error("push", err instanceof WebPushError ? err.statusCode : err);
          }
        }),
    ),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  return sent;
}

/** Topic: max 32 caratteri URL-safe. Una notifica più nuova con lo stesso topic sostituisce quella in attesa. */
function topicOf(tag: string) {
  return tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
}
