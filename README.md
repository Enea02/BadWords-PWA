# Bad Words

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

Utenti demo in locale (nome utente / password): `giulia` (admin), `marta`, `sofia`, `chiara`, `bea` — tutte con `password123`. Gruppo "Le Sboccate", codice invito `SBOCCA`.

## Accesso

Nome utente + password, niente email. Il nome utente diventa un indirizzo interno `<nome>@swearjar.invalid` che non riceve posta. La registrazione pubblica di Supabase è chiusa (`[auth] enable_signup = false`): gli account li crea il server, con la service role, solo dopo aver verificato il codice invito (`/registrati`). Chi non ha un codice può creare un gruppo e ne diventa admin.

Password dimenticata: per ora la reimposta l'admin del progetto da Supabase (Authentication → Users); dal pannello Gruppo in Fase 7.

## Fine mese

Ogni giorno alle 00:05 UTC Vercel Cron chiama `/api/cron/close-month` (vedi `vercel.json`) con `Authorization: Bearer $CRON_SECRET`. La rotta esegue `close_pending_months()` con la service role: chiude tutti i mesi passati non ancora chiusi, assegna la penitenza grossa a chi ha il totale più alto (pari merito: a tutte) e salva lo snapshot per lo Storico. È idempotente: se un giorno salta, recupera il giro dopo.

Provarla in locale senza aspettare un mese:

```bash
pnpm db:reset
pnpm dev:mesi-finti   # il gruppo "esiste" da 3 mesi: ottobre (vince Giulia), settembre (pari merito), agosto (vuoto)
pnpm dev              # in un altro terminale
pnpm dev:chiudi-mesi  # curl sulla rotta cron col CRON_SECRET di .env.local
```

Poi entra come `giulia`: compare "Bocca sporca del mese"; lo Storico mostra i tre mesi.

## Design

`design/` è vincolante: `tokens.css` (unica fonte dei colori, mappata nel tema Tailwind in `src/app/globals.css`), `Stamp.tsx`, `PaperGrain.tsx`, `Avatar.tsx`. Artboard in `design/screens/README.md`.
