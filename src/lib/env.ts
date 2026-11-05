/**
 * Variabili pubbliche: finiscono nel bundle del browser.
 * Vanno lette con il nome completo (process.env.NEXT_PUBLIC_…) perché Next le
 * sostituisce in build; per questo non si possono leggere con una chiave dinamica.
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name} (vedi .env.example)`);
  return value;
}

export const publicEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

export { required };
