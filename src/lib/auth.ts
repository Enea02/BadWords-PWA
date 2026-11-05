import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Profilo dell'utente loggato con il suo gruppo (Data Access Layer).
 * Senza sessione → /login. Sessione senza profilo (registrazione interrotta) → /esci.
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_url, role, group:groups (id, name, invite_code, timezone)")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.group) redirect("/esci");
  return { ...profile, group: profile.group };
});

export type CurrentProfile = Awaited<ReturnType<typeof getCurrentProfile>>;
