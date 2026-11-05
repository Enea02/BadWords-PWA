"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PenanceMode = "deck" | "custom";

/** Solo admin: lo verificano anche RLS e grant sul database. */
export async function setPenanceMode(mode: PenanceMode): Promise<{ ok: boolean }> {
  if (mode !== "deck" && mode !== "custom") return { ok: false };
  const me = await getCurrentProfile();
  if (me.role !== "admin") return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ penance_mode: mode })
    .eq("id", me.group.id)
    .select("id");
  return { ok: !error && (data?.length ?? 0) > 0 };
}
