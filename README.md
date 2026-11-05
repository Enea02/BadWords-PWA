# Swear Jar

La carta fedeltà al contrario per un gruppo di amiche: ogni parolaccia è un timbro, ogni 10 timbri nel mese una penitenza, a fine mese chi ne ha di più prende la penitenza grossa.

Next.js (App Router) · TypeScript · Tailwind v4 · Supabase · Vercel.

> README completo (deploy, collegamento a Supabase, inviti) in arrivo a fine progetto.

## Setup locale

Requisiti: Node 24, pnpm, Docker, Supabase CLI.

```bash
pnpm install
pnpm db:start                 # Supabase locale (porte 553xx, vedi supabase/config.toml)
cp .env.example .env.local    # e incolla i valori di `supabase status -o env`
pnpm dev                      # http://localhost:3000
```

- Studio: http://127.0.0.1:55323
- Email di test (magic link): http://127.0.0.1:55324

## Database

Migrazioni in `supabase/migrations`, seed locale in `supabase/seed.sql`, test pgTAP in `supabase/tests`.

```bash
pnpm db:reset   # riapplica migrazioni + seed
pnpm db:test    # test SQL (soglie, annullamento, chiusura mese, RLS)
pnpm db:types   # rigenera src/lib/database.types.ts
```

La logica di gioco vive nel database: trigger sui timbri (mese in ora del gruppo, penitenza ogni 10), vista `monthly_board`, RPC `close_month` / `close_pending_months` (solo `service_role`), RLS su tutte le tabelle.

Utenti demo in locale: `giulia@example.test` (admin), `marta@`, `sofia@`, `chiara@`, `bea@` — gruppo "Le Sboccate", codice `SBOCCA`.

## Design

`design/` è vincolante: `tokens.css` (unica fonte dei colori, mappata nel tema Tailwind in `src/app/globals.css`), `Stamp.tsx`, `PaperGrain.tsx`, `Avatar.tsx`. Artboard in `design/screens/README.md`.
