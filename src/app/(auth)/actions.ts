"use server";

import { redirect } from "next/navigation";
import { GIRL_COLORS, type GirlColor } from "@design/girls";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail, validatePassword, validateUsername } from "@/lib/username";

export type FormState = { error?: string; field?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ─────────────── Login ───────────────

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const username = str(fd, "username");
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Scrivi nome utente e password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) {
    // Messaggio unico: non diciamo se esiste il nome utente.
    return { error: error.status === 429 ? "Troppi tentativi: riprova tra qualche minuto." : "Nome utente o password sbagliati." };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─────────────── Registrazione: passo 1 ───────────────

export type InvitePreview = {
  name: string;
  members: { display_name: string; color: GirlColor; avatar_url: string | null; role: "admin" | "member" }[];
};

export async function previewInvite(code: string): Promise<InvitePreview | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(clean)) return null;
  const { data, error } = await createAdminClient().rpc("preview_invite", { p_code: clean });
  if (error || !data) return null;
  return data as unknown as InvitePreview;
}

const validateGroupName = (name: string) =>
  name.length < 1 ? "Dai un nome al gruppo." : name.length > 60 ? "Il nome del gruppo è troppo lungo." : null;

/** Controlla il passo 1 senza creare niente: codice (o nome gruppo), nome utente libero, password. */
export async function checkAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const mode = str(fd, "mode");
  if (mode === "join") {
    if (!(await previewInvite(str(fd, "code")))) return { error: "Codice invito non valido.", field: "code" };
  } else {
    const err = validateGroupName(str(fd, "groupName"));
    if (err) return { error: err, field: "groupName" };
  }

  const userErr = validateUsername(str(fd, "username"));
  if (userErr) return { error: userErr, field: "username" };
  const pwErr = validatePassword(String(fd.get("password") ?? ""));
  if (pwErr) return { error: pwErr, field: "password" };

  const { data: taken } = await createAdminClient().rpc("auth_email_taken", {
    p_email: usernameToEmail(str(fd, "username")),
  });
  if (taken) return { error: "Questo nome utente è già preso.", field: "username" };

  return {};
}

// ─────────────── Registrazione: passo 2 (crea tutto) ───────────────

const AVATAR_ICONS = new Set(["peperoncino", "fulmine", "bomba"]);
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_MAX = 512 * 1024;

/**
 * Crea account + profilo in un colpo solo. Se qualcosa va storto (colore appena preso,
 * codice cambiato…) l'account appena creato viene cancellato: niente utenti a metà.
 */
export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  // Ricontrolla il passo 1: il client non è affidabile.
  const step1 = await checkAccount(undefined, fd);
  if (step1?.error) return step1;

  const mode = str(fd, "mode");
  const username = str(fd, "username");
  const password = String(fd.get("password") ?? "");
  const displayName = str(fd, "displayName");
  const color = str(fd, "color") as GirlColor;
  const avatar = str(fd, "avatar");
  const photo = fd.get("photo");

  if (displayName.length < 1 || displayName.length > 24)
    return { error: "Scrivi come ti chiamano (massimo 24 caratteri).", field: "displayName" };
  if (!GIRL_COLORS.includes(color)) return { error: "Scegli il colore del tuo inchiostro.", field: "color" };
  const hasPhoto = avatar === "foto" && photo instanceof File && photo.size > 0;
  if (avatar === "foto" && !hasPhoto) return { error: "Scegli una foto o un altro avatar.", field: "avatar" };
  if (hasPhoto && (!PHOTO_TYPES.has(photo.type) || photo.size > PHOTO_MAX))
    return { error: "La foto deve essere un'immagine sotto i 512 KB.", field: "avatar" };

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username: username.toLowerCase() },
  });
  if (createErr || !created.user) {
    const taken = createErr?.code === "email_exists" || /already/i.test(createErr?.message ?? "");
    return taken
      ? { error: "Questo nome utente è già preso.", field: "username" }
      : { error: "Non è stato possibile creare l'account. Riprova." };
  }
  const userId = created.user.id;

  const rollback = async (photoPath?: string) => {
    if (photoPath) await admin.storage.from("avatars").remove([photoPath]);
    await admin.auth.admin.deleteUser(userId);
  };

  let avatarUrl: string | null = AVATAR_ICONS.has(avatar) ? `icon:${avatar}` : null;
  let photoPath: string | undefined;
  if (hasPhoto) {
    photoPath = `${userId}/${crypto.randomUUID()}.${photo.type.split("/")[1]}`;
    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(photoPath, photo, { contentType: photo.type, upsert: false });
    if (upErr) {
      await rollback();
      return { error: "Caricamento della foto non riuscito. Riprova o scegli un altro avatar.", field: "avatar" };
    }
    avatarUrl = admin.storage.from("avatars").getPublicUrl(photoPath).data.publicUrl;
  }

  const rpc =
    mode === "join"
      ? admin.rpc("join_group", {
          p_user: userId,
          p_code: str(fd, "code"),
          p_display_name: displayName,
          p_color: color,
          p_avatar: avatarUrl as string,
        })
      : admin.rpc("create_group", {
          p_user: userId,
          p_group_name: str(fd, "groupName"),
          p_display_name: displayName,
          p_color: color,
          p_avatar: avatarUrl as string,
        });

  const { error: rpcErr } = await rpc;
  if (rpcErr) {
    await rollback(photoPath);
    if (rpcErr.code === "23505") return { error: "Questo colore l'ha appena preso un'altra: scegline un altro.", field: "color" };
    if (rpcErr.code === "SJ404") return { error: "Il codice invito non è più valido.", field: "code" };
    return { error: "Qualcosa è andato storto. Riprova." };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (signInErr) redirect("/login");
  redirect("/");
}
