"use server";

import { randomInt } from "node:crypto";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Controllo comune per le azioni con service role: chi chiede è admin
 * e la ragazza bersaglio è nello STESSO gruppo (e non è lei stessa).
 */
async function assertAdminOver(profileId: string) {
  const me = await getCurrentProfile();
  if (me.role !== "admin") return { error: "Solo l'admin può farlo." } as const;
  if (profileId === me.id) return { error: "Questa azione non vale su te stessa." } as const;
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, display_name, role, group_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!target || target.group_id !== me.group.id) return { error: "Questa ragazza non è nel tuo gruppo." } as const;
  return { me, admin, target } as const;
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Password provvisoria: l'admin la passa all'amica, che poi la cambia da Gruppo → Il tuo account. */
export async function resetMemberPassword(profileId: string): Promise<{ password?: string; error?: string }> {
  const check = await assertAdminOver(profileId);
  if ("error" in check) return { error: check.error };
  const password = Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const { error } = await check.admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { error: "Reimpostazione non riuscita. Riprova." };
  return { password };
}

/**
 * Rimuove una ragazza dal gruppo: cancella l'account (e a cascata profilo, timbri e penitenze).
 * Lo Storico dei mesi chiusi resta: usa gli snapshot. L'ultima admin non si rimuove.
 */
export async function removeMember(profileId: string): Promise<{ ok?: true; error?: string }> {
  const check = await assertAdminOver(profileId);
  if ("error" in check) return { error: check.error };
  if (check.target.role === "admin") {
    const { count } = await check.admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("group_id", check.me.group.id)
      .eq("role", "admin");
    if ((count ?? 0) <= 1) return { error: "Il gruppo deve avere almeno un'admin." };
  }
  // Foto profilo, se c'è.
  const { data: files } = await check.admin.storage.from("avatars").list(profileId);
  if (files?.length) await check.admin.storage.from("avatars").remove(files.map((f) => `${profileId}/${f.name}`));

  const { error } = await check.admin.auth.admin.deleteUser(profileId);
  if (error) return { error: "Rimozione non riuscita. Riprova." };
  return { ok: true };
}
