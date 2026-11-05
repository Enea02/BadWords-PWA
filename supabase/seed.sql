-- Swear Jar · seed per lo sviluppo locale (eseguito da `supabase db reset`).
-- Non viene applicato in produzione.

-- ─────────────── Gruppo ───────────────
insert into public.groups (id, name, invite_code, timezone)
values ('00000000-0000-4000-8000-00000000a001', 'Le Sboccate', 'SBOCCA', 'Europe/Rome');

-- ─────────────── Legenda (ordine e icone come nel design) ───────────────
insert into public.words (group_id, label, icon, sort_order) values
  ('00000000-0000-4000-8000-00000000a001', 'C***o', 'peperoncino', 1),
  ('00000000-0000-4000-8000-00000000a001', 'Vaff***', 'aeroplano', 2),
  ('00000000-0000-4000-8000-00000000a001', 'M***a', 'nuvola', 3),
  ('00000000-0000-4000-8000-00000000a001', 'S****o', 'bomba', 4),
  ('00000000-0000-4000-8000-00000000a001', 'Bestemmia', 'fulmine', 5),
  ('00000000-0000-4000-8000-00000000a001', 'Altro', 'asterisco', 6);

-- ─────────────── Mazzo delle penitenze ───────────────
insert into public.penances (group_id, kind, text) values
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Offri il caffè a tutte al prossimo incontro.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Manda nel gruppo un vocale di scuse il più teatrale possibile.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Per 24 ore ogni tuo messaggio finisce con "con affetto".'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Canta il ritornello di una canzone scelta dalle altre.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Fai un complimento sincero a ognuna del gruppo.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Paghi tu il prossimo giro di patatine.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Per un giorno niente emoji: solo parole gentili.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Racconta una figuraccia che nessuna conosce.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Scegli il prossimo film, ma dev''essere romantico.'),
  ('00000000-0000-4000-8000-00000000a001', 'small', 'Per un giorno tieni la foto profilo scelta dal gruppo.'),
  ('00000000-0000-4000-8000-00000000a001', 'monthly', 'Organizzi e offri l''aperitivo a tutte.'),
  ('00000000-0000-4000-8000-00000000a001', 'monthly', 'Cucini una cena per il gruppo, dall''antipasto al dolce.'),
  ('00000000-0000-4000-8000-00000000a001', 'monthly', 'Per un''intera serata parli come una nobildonna dell''Ottocento.');

-- ─────────────── Utenti demo ───────────────
-- Accesso in locale con magic link: le email arrivano su http://127.0.0.1:55324
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000b1'::uuid, 'giulia@example.test'),
  ('00000000-0000-4000-8000-0000000000b2'::uuid, 'marta@example.test'),
  ('00000000-0000-4000-8000-0000000000b3'::uuid, 'sofia@example.test'),
  ('00000000-0000-4000-8000-0000000000b4'::uuid, 'chiara@example.test'),
  ('00000000-0000-4000-8000-0000000000b5'::uuid, 'bea@example.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email like '%@example.test';

insert into public.profiles (id, group_id, display_name, color, role) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a001', 'Giulia', 'magenta', 'admin'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-00000000a001', 'Marta', 'blu', 'member'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-00000000a001', 'Sofia', 'verde', 'member'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-00000000a001', 'Chiara', 'viola', 'member'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-00000000a001', 'Bea', 'arancio', 'member');
