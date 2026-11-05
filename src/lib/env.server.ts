import "server-only";
import { required } from "./env";

/** Segreti: importabile solo da codice server (build error se finisce in un client component). */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get cronSecret() {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
  get pushWebhookSecret() {
    return required("PUSH_WEBHOOK_SECRET", process.env.PUSH_WEBHOOK_SECRET);
  },
  /** null = notifiche push non configurate: la coda si svuota senza inviare. */
  get vapid() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "https://bad-words.invalid" };
  },
};
