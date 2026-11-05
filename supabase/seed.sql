-- Swear Jar · seed per lo sviluppo locale (eseguito da `supabase db reset`).
-- Non viene applicato in produzione: lì il primo gruppo si crea dall'app ("creo un gruppo").

-- ─────────────── Gruppo, legenda e mazzo ───────────────
insert into public.groups (id, name, invite_code, timezone)
values ('00000000-0000-4000-8000-00000000a001', 'Le Sboccate', 'SBOCCA', 'Europe/Rome');

select public.seed_group_defaults('00000000-0000-4000-8000-00000000a001');

-- ─────────────── Utenti demo ───────────────
-- Accesso con nome utente + password "password123".
-- Il nome utente diventa l'email interna <nome>@swearjar.invalid (vedi src/lib/username.ts).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.username || '@swearjar.invalid', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('username', u.username), now(), now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000b1'::uuid, 'giulia'),
  ('00000000-0000-4000-8000-0000000000b2'::uuid, 'marta'),
  ('00000000-0000-4000-8000-0000000000b3'::uuid, 'sofia'),
  ('00000000-0000-4000-8000-0000000000b4'::uuid, 'chiara'),
  ('00000000-0000-4000-8000-0000000000b5'::uuid, 'bea')
) as u (id, username);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email like '%@swearjar.invalid';

insert into public.profiles (id, group_id, display_name, color, avatar_url, role) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a001', 'Giulia', 'fucsia', null, 'admin'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-00000000a001', 'Marta', 'blu', 'icon:aeroplano', 'member'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-00000000a001', 'Sofia', 'verde', null, 'member'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-00000000a001', 'Chiara', 'viola', 'icon:fulmine', 'member'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-00000000a001', 'Bea', 'arancio', null, 'member');
