import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/** Client per Server Component, Server Action e Route Handler: agisce come l'utente loggato (RLS). */
export async function createClient() {
  // auth-js legge Date.now() per la scadenza della sessione: con Cache Components
  // va eseguito solo a richiesta, mai durante il prerender.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chiamato da un Server Component: i cookie li rinnova il proxy.
        }
      },
    },
  });
}
