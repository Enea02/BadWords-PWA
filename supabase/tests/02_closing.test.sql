-- Chiusura del mese: pari merito, idempotenza, mese vuoto, mesi pendenti, permessi.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(16);

-- ─────────────── Fixture ───────────────
-- Gruppo creato 3 mesi fa: m3 (vuoto, chiuso da close_pending_months), m2 (vuoto), m1 (pari merito).
create temporary table _m as
select
  (public.month_start(now(), 'Europe/Rome') - interval '1 month')::date as m1,
  (public.month_start(now(), 'Europe/Rome') - interval '2 months')::date as m2,
  (public.month_start(now(), 'Europe/Rome') - interval '3 months')::date as m3,
  public.month_start(now(), 'Europe/Rome') as cur;

insert into public.groups (id, name, invite_code, created_at)
select '22222222-0000-4000-8000-00000000000a', 'Gruppo A', 'TESTCA',
       (m3 + interval '3 days')::timestamp at time zone 'Europe/Rome'
from _m;

insert into auth.users (id, email) values
  ('22222222-0000-4000-8000-0000000000a0', 'admin@c.test'),
  ('22222222-0000-4000-8000-0000000000a1', 'uno@c.test'),
  ('22222222-0000-4000-8000-0000000000a2', 'due@c.test');

insert into public.profiles (id, group_id, display_name, color, role) values
  ('22222222-0000-4000-8000-0000000000a0', '22222222-0000-4000-8000-00000000000a', 'Admin', 'fucsia', 'admin'),
  ('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member'),
  ('22222222-0000-4000-8000-0000000000a2', '22222222-0000-4000-8000-00000000000a', 'Due', 'verde', 'member');

insert into public.words (id, group_id, label, icon) values
  ('22222222-0000-4000-8000-0000000000c1', '22222222-0000-4000-8000-00000000000a', 'Cosa', 'nuvola');

insert into public.penances (group_id, kind, text) values
  ('22222222-0000-4000-8000-00000000000a', 'monthly', 'Grossa 1'),
  ('22222222-0000-4000-8000-00000000000a', 'monthly', 'Grossa 2'),
  ('22222222-0000-4000-8000-00000000000a', 'monthly', 'Grossa 3');

-- m1: Uno 3, Due 3, Admin 1 valido + 2 annullati (se contassero sarebbe a pari merito).
insert into public.stamps (group_id, profile_id, word_id, created_at, voided_at)
select '22222222-0000-4000-8000-00000000000a', p.profile_id, '22222222-0000-4000-8000-0000000000c1',
       (m1 + interval '5 days')::timestamp at time zone 'Europe/Rome', p.voided
from _m, (values
  ('22222222-0000-4000-8000-0000000000a1'::uuid, null::timestamptz),
  ('22222222-0000-4000-8000-0000000000a1'::uuid, null), ('22222222-0000-4000-8000-0000000000a1'::uuid, null),
  ('22222222-0000-4000-8000-0000000000a2'::uuid, null), ('22222222-0000-4000-8000-0000000000a2'::uuid, null),
  ('22222222-0000-4000-8000-0000000000a2'::uuid, null),
  ('22222222-0000-4000-8000-0000000000a0'::uuid, null),
  ('22222222-0000-4000-8000-0000000000a0'::uuid, now()), ('22222222-0000-4000-8000-0000000000a0'::uuid, now())
) as p (profile_id, voided);

-- ─────────────── Mese corrente ───────────────
select throws_ok(
  format('select public.close_month(%L, %L)', '22222222-0000-4000-8000-00000000000a', (select cur from _m)),
  '22023', null, 'il mese in corso non si chiude');

-- ─────────────── Pari merito ───────────────
select lives_ok(
  format('select public.close_month(%L, %L)', '22222222-0000-4000-8000-00000000000a', (select m1 from _m)),
  'chiusura del mese scorso');

select results_eq(
  format($$ select profile_id from public.penance_assignments
            where kind = 'monthly' and month = %L order by profile_id $$, (select m1 from _m)),
  $$ values ('22222222-0000-4000-8000-0000000000a1'::uuid), ('22222222-0000-4000-8000-0000000000a2'::uuid) $$,
  'a pari merito la penitenza grossa va a tutte le prime (i timbri annullati non contano)');

select is(
  (select count(distinct penance_id)::int from public.penance_assignments
   where kind = 'monthly' and month = (select m1 from _m)),
  1, 'le prime a pari merito prendono la stessa penitenza');

select ok(
  (select bool_and(threshold is null and status = 'pending') from public.penance_assignments
   where kind = 'monthly' and month = (select m1 from _m)),
  'monthly senza soglia, da fare');

select results_eq(
  format($$ select (e->>'display_name'), (e->>'total')::int, (e->>'rank')::int
            from public.month_closures c, jsonb_array_elements(c.snapshot) e
            where c.group_id = '22222222-0000-4000-8000-00000000000a' and c.month = %L $$, (select m1 from _m)),
  $$ values ('Due', 3, 1), ('Uno', 3, 1), ('Admin', 1, 2) $$,
  'lo snapshot ha i totali e il podio');

-- ─────────────── Idempotenza ───────────────
select public.close_month('22222222-0000-4000-8000-00000000000a', (select m1 from _m));

select is(
  (select count(*)::int from public.penance_assignments where kind = 'monthly'
   and group_id = '22222222-0000-4000-8000-00000000000a'),
  2, 'richiamare close_month non duplica le assegnazioni');

-- ─────────────── Mese vuoto ───────────────
select public.close_month('22222222-0000-4000-8000-00000000000a', (select m2 from _m));

select is(
  (select count(*)::int from public.penance_assignments where month = (select m2 from _m)),
  0, 'mese senza timbri: nessuna penitenza');

select is(
  (select (select sum((e->>'total')::int) from jsonb_array_elements(snapshot) e)::int
   from public.month_closures where group_id = '22222222-0000-4000-8000-00000000000a' and month = (select m2 from _m)),
  0, 'mese senza timbri: chiusura registrata con totali a zero');

-- ─────────────── Mesi pendenti ───────────────
select results_eq(
  $$ select closed_month from public.close_pending_months()
     where closed_group = '22222222-0000-4000-8000-00000000000a' $$,
  $$ select m3 from _m $$,
  'close_pending_months chiude solo il mese mancante (m3)');

select is(
  (select count(*)::int from public.close_pending_months()
   where closed_group = '22222222-0000-4000-8000-00000000000a'),
  0, 'seconda esecuzione: niente da chiudere');

select is(
  (select count(*)::int from public.month_closures where group_id = '22222222-0000-4000-8000-00000000000a'),
  3, 'tre mesi chiusi, quello corrente no');

-- ─────────────── Solo service_role ───────────────
-- Si verificano i privilegi invece di chiamare le funzioni come `authenticated`:
-- nell'immagine locale postgres 17.6.1.106 una funzione negata, chiamata da una
-- sessione psql `postgres` + SET ROLE, manda il backend in segfault. Via PostgREST
-- la stessa chiamata risponde correttamente 42501 (verificato a mano).
select ok(not has_function_privilege('authenticated', 'public.close_month(uuid, date)', 'execute'),
  'authenticated non può eseguire close_month');
select ok(not has_function_privilege('anon', 'public.close_month(uuid, date)', 'execute'),
  'anon non può eseguire close_month');
select ok(not has_function_privilege('authenticated', 'public.close_pending_months()', 'execute'),
  'authenticated non può eseguire close_pending_months');
select ok(has_function_privilege('service_role', 'public.close_pending_months()', 'execute'),
  'service_role può eseguire close_pending_months');

select * from finish();
rollback;
