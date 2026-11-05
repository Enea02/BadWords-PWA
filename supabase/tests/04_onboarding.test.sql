-- Onboarding: anteprima codice, ingresso, creazione gruppo, colori unici, permessi.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('44444444-0000-4000-8000-0000000000e1', 'nuova@swearjar.invalid'),
  ('44444444-0000-4000-8000-0000000000e2', 'altra@swearjar.invalid'),
  ('44444444-0000-4000-8000-0000000000e3', 'capa@swearjar.invalid');

-- ─────────────── Anteprima ───────────────
select is(public.preview_invite('NOPE00'), null, 'codice inesistente: anteprima nulla');

select is(public.preview_invite(' sbocca ')->>'name', 'Le Sboccate',
  'il codice si legge senza spazi e senza badare alle maiuscole');

select is(jsonb_array_length(public.preview_invite('SBOCCA')->'members'), 5,
  'l''anteprima elenca le 5 ragazze del seed');

select ok(not (public.preview_invite('SBOCCA')->'members'->0 ? 'id'),
  'l''anteprima non espone gli id');

-- ─────────────── Ingresso ───────────────
select throws_ok(
  $$ select public.join_group('44444444-0000-4000-8000-0000000000e1', 'NOPE00', 'Nuova', 'petrolio', null) $$,
  'SJ404', null, 'codice sbagliato: SJ404');

select throws_ok(
  $$ select public.join_group('44444444-0000-4000-8000-0000000000e1', 'SBOCCA', 'Nuova', 'fucsia', null) $$,
  '23505', null, 'colore già preso da Giulia: 23505');

select is(
  (public.join_group('44444444-0000-4000-8000-0000000000e1', 'sbocca', '  Nuova  ', 'petrolio', 'icon:bomba')).display_name,
  'Nuova', 'ingresso riuscito, nome ripulito');

select results_eq(
  $$ select g.name, p.role::text, p.color::text from public.profiles p join public.groups g on g.id = p.group_id
     where p.id = '44444444-0000-4000-8000-0000000000e1' $$,
  $$ values ('Le Sboccate', 'member', 'petrolio') $$,
  'entra come member nel gruppo del codice');

select throws_ok(
  $$ select public.join_group('44444444-0000-4000-8000-0000000000e1', 'SBOCCA', 'Doppia', 'ocra', null) $$,
  'SJ409', null, 'non si entra due volte');

select throws_ok(
  $$ select public.join_group('44444444-0000-4000-8000-0000000000e2', 'SBOCCA', 'Altra', 'ocra', 'ftp://x') $$,
  '23514', null, 'avatar_url in formato non valido');

select ok(public.auth_email_taken('GIULIA@swearjar.invalid'), 'nome utente già preso (case-insensitive)');
select ok(not public.auth_email_taken('libera@swearjar.invalid'), 'nome utente libero');

-- ─────────────── Creazione gruppo ───────────────
select is(
  (public.create_group('44444444-0000-4000-8000-0000000000e3', 'Le Nuove', 'Capa', 'fucsia', null)).role::text,
  'admin', 'chi crea il gruppo è admin (e il fucsia è libero nel nuovo gruppo)');

select results_eq(
  $$ select (select count(*)::int from public.words w where w.group_id = p.group_id),
            (select count(*)::int from public.penances x where x.group_id = p.group_id and x.kind = 'small'),
            (select count(*)::int from public.penances x where x.group_id = p.group_id and x.kind = 'monthly'),
            (select g.invite_code ~ '^[A-HJ-NP-Z2-9]{6}$' from public.groups g where g.id = p.group_id)
     from public.profiles p where p.id = '44444444-0000-4000-8000-0000000000e3' $$,
  $$ values (6, 10, 3, true) $$,
  'il gruppo nuovo ha legenda, mazzo e un codice invito non ambiguo');

-- ─────────────── Permessi ───────────────
select ok(not has_function_privilege('authenticated', 'public.join_group(uuid, text, text, public.girl_color, text)', 'execute'),
  'authenticated non chiama join_group');
select ok(not has_function_privilege('anon', 'public.preview_invite(text)', 'execute'),
  'anon non chiama preview_invite (niente enumerazione dei codici dall''API)');

select ok((select public from storage.buckets where id = 'avatars'), 'bucket avatars pubblico in lettura');

select * from finish();
rollback;
