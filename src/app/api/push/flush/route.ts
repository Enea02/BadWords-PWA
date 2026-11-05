import { NextResponse, type NextRequest } from "next/server";
import { hasBearer } from "@/lib/bearer.server";
import { serverEnv } from "@/lib/env.server";
import { flushPushOutbox } from "@/lib/push.server";

/**
 * Chiamata dal database (pg_net, trigger su push_outbox) quando c'è qualcosa da notificare.
 * Il secret sta nel Vault di Supabase (`push_flush_secret`) e in PUSH_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!hasBearer(request.headers.get("authorization"), serverEnv.pushWebhookSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await flushPushOutbox();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("flushPushOutbox", err);
    return NextResponse.json({ error: "flush_failed" }, { status: 500 });
  }
}
