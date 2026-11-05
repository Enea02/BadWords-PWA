/**
 * Accesso con nome utente: Supabase Auth vuole un'email, quindi il nome utente
 * diventa un indirizzo interno che non riceve mai posta (.invalid è riservato, RFC 2606).
 */
export const USERNAME_DOMAIN = "swearjar.invalid";

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3) return "Il nome utente deve avere almeno 3 caratteri.";
  if (u.length > 20) return "Il nome utente può avere al massimo 20 caratteri.";
  if (!USERNAME_RE.test(u)) return "Usa solo lettere, numeri, punto, trattino o trattino basso.";
  return null;
}

export const MIN_PASSWORD = 8;

export function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `La password deve avere almeno ${MIN_PASSWORD} caratteri.`;
  if (pw.length > 72) return "La password è troppo lunga.";
  return null;
}
