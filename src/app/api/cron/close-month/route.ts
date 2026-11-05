import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Chiusura dei mesi passati (Vercel Cron, ogni giorno alle 00:05 UTC: vedi vercel.json).
 * Vercel invia `Authorization: Bearer ${CRON_SECRET}`. Idempotente: richiamarla non fa danni.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("close_pending_months");
  if (error) {
    console.error("close_pending_months", error);
    return NextResponse.json({ error: "close_failed" }, { status: 500 });
  }

  const closed = (data ?? []).map((r) => ({ group: r.closed_group, month: r.closed_month }));
  return NextResponse.json({ closed }, { headers: { "Cache-Control": "no-store" } });
}

function authorized(header: string | null) {
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
