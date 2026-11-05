"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Servizi push dei browser: il server invia solo a questi (niente richieste verso URL arbitrari). */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

function validEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const validKey = (k: unknown, max: number): k is string =>
  typeof k === "string" && k.length > 0 && k.length <= max && /^[A-Za-z0-9_=-]+$/.test(k);

export type SubscriptionJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Iscrive questo dispositivo per l'utente corrente. Un dispositivo appartiene a una sola persona. */
export async function savePushSubscription(sub: SubscriptionJSON): Promise<{ ok: boolean }> {
  const { endpoint, keys } = sub ?? {};
  if (!validEndpoint(endpoint) || !validKey(keys?.p256dh, 200) || !validKey(keys?.auth, 100)) return { ok: false };
  const me = await getCurrentProfile();
  const admin = createAdminClient();
  // Telefono condiviso: se l'endpoint era di un'altra, ora è di chi è entrata.
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    profile_id: me.id,
    group_id: me.group.id,
    endpoint,
    p256dh: keys!.p256dh!,
    auth: keys!.auth!,
  });
  return { ok: !error };
}

/** Disiscrive questo dispositivo (solo se è dell'utente corrente). */
export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  if (!validEndpoint(endpoint)) return { ok: false };
  const me = await getCurrentProfile();
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("profile_id", me.id);
  return { ok: !error };
}
