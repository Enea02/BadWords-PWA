import { NextResponse, type NextRequest } from "next/server";
import { hasBearer } from "@/lib/bearer.server";
import { serverEnv } from "@/lib/env.server";
import { flushPushOutbox } from "@/lib/push.server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Chiusura dei mesi passati (Vercel Cron, ogni giorno alle 00:05 UTC: vedi vercel.json).
 * Vercel invia `Authorization: Bearer ${CRON_SECRET}`. Idempotente: richiamarla non fa danni.
 * Dopo la chiusura svuota anche la coda delle notifiche push (rete di sicurezza del webhook).
 */
export async function GET(request: NextRequest) {
  if (!hasBearer(request.headers.get("authorization"), serverEnv.cronSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("close_pending_months");
  if (error) {
    console.error("close_pending_months", error);
    return NextResponse.json({ error: "close_failed" }, { status: 500 });
  }

  const closed = (data ?? []).map((r) => ({ group: r.closed_group, month: r.closed_month }));
  const push = await flushPushOutbox().catch((err) => {
    console.error("flushPushOutbox", err);
    return { error: "push_failed" };
  });
  return NextResponse.json({ closed, push }, { headers: { "Cache-Control": "no-store" } });
}
