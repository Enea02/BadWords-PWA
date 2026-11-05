-- RLS: isolamento tra due gruppi e permessi dentro il gruppo.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;

select plan(23);

-- ─────────────── Fixture: gruppo A (admin, uno, due) e gruppo B (bi) ───────────────
insert into public.groups (id, name, invite_code) values
  ('33333333-0000-4000-8000-00000000000a', 'Gruppo A', 'TESTRA'),
  ('33333333-0000-4000-8000-00000000000b', 'Gruppo B', 'TESTRB');

insert into auth.users (id, email) values
  ('33333333-0000-4000-8000-0000000000a0', 'admin@r.test'),
  ('33333333-0000-4000-8000-0000000000a1', 'uno@r.test'),
  ('33333333-0000-4000-8000-0000000000a2', 'due@r.test'),
  ('33333333-0000-4000-8000-0000000000b1', 'bi@r.test');

insert into public.profiles (id, group_id, display_name, color, role) values
  ('33333333-0000-4000-8000-0000000000a0', '33333333-0000-4000-8000-00000000000a', 'Admin', 'magenta', 'admin'),
  ('33333333-0000-4000-8000-0000000000a1', '33333333-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member'),
  ('33333333-0000-4000-8000-0000000000a2', '33333333-0000-4000-8000-00000000000a', 'Due', 'verde', 'member'),
  ('33333333-0000-4000-8000-0000000000b1', '33333333-0000-4000-8000-00000000000b', 'Bi', 'viola', 'admin');

insert into public.words (id, group_id, label, icon) values
  ('33333333-0000-4000-8000-0000000000ca', '33333333-0000-4000-8000-00000000000a', 'Parola A', 'nuvola'),
  ('33333333-0000-4000-8000-0000000000cb', '33333333-0000-4000-8000-00000000000b', 'Parola B', 'bomba');

insert into public.penances (group_id, kind, text) values
  ('33333333-0000-4000-8000-00000000000a', 'small', 'Piccola A');

-- Uno arriva a 10 (una penitenza in A); il mese precedente di A è chiuso.
insert into public.stamps (group_id, profile_id, word_id, created_by)
select '33333333-0000-4000-8000-00000000000a', '33333333-0000-4000-8000-0000000000a1',
       '33333333-0000-4000-8000-0000000000ca', '33333333-0000-4000-8000-0000000000a1'
from generate_series(1, 10);

insert into public.month_closures (group_id, month, snapshot)
values ('33333333-0000-4000-8000-00000000000a', '2026-01-01', '[]');

-- ─────────────── Bi (gruppo B) non vede il gruppo A ───────────────
select set_config('request.jwt.claims', '{"sub":"33333333-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;

select results_eq($$ select id from public.groups $$,
  $$ values ('33333333-0000-4000-8000-00000000000b'::uuid) $$, 'B vede solo il proprio gruppo');
select is((select count(*)::int from public.profiles where group_id <> '33333333-0000-4000-8000-00000000000b'), 0,
  'B non vede le ragazze di A');
select is((select count(*)::int from public.stamps), 0, 'B non vede i timbri di A');
select is((select count(*)::int from public.monthly_board), 0, 'B non vede il tabellone di A');
select is((select count(*)::int from public.words where group_id <> '33333333-0000-4000-8000-00000000000b'), 0,
  'B non vede la legenda di A');
select is((select count(*)::int from public.penances), 0, 'B non vede il mazzo di A');
select is((select count(*)::int from public.penance_assignments), 0, 'B non vede le penitenze di A');
select is((select count(*)::int from public.month_closures), 0, 'B non vede lo storico di A');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('33333333-0000-4000-8000-00000000000a', '33333333-0000-4000-8000-0000000000a1',
      '33333333-0000-4000-8000-0000000000ca', '33333333-0000-4000-8000-0000000000b1') $$,
  '42501', null, 'B non può timbrare nel gruppo A');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('33333333-0000-4000-8000-00000000000b', '33333333-0000-4000-8000-0000000000a1',
      '33333333-0000-4000-8000-0000000000cb', '33333333-0000-4000-8000-0000000000b1') $$,
  '23503', null, 'B non può timbrare una ragazza di A nel proprio gruppo');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('33333333-0000-4000-8000-00000000000b', '33333333-0000-4000-8000-0000000000b1',
      '33333333-0000-4000-8000-0000000000ca', '33333333-0000-4000-8000-0000000000b1') $$,
  '23514', null, 'B non può usare una parolaccia di A');

with u as (update public.words set label = 'Hack' where group_id = '33333333-0000-4000-8000-00000000000a' returning 1)
select is((select count(*)::int from u), 0, 'B (admin del suo gruppo) non modifica la legenda di A');

-- ─────────────── Uno (membro di A) ───────────────
select set_config('request.jwt.claims', '{"sub":"33333333-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from public.monthly_board), 1, 'Uno vede il tabellone del suo gruppo');

select throws_ok(
  $$ insert into public.penance_assignments (group_id, profile_id, kind, month, threshold)
     values ('33333333-0000-4000-8000-00000000000a', '33333333-0000-4000-8000-0000000000a2', 'small', '2026-11-01', 10) $$,
  '42501', null, 'i client non creano penitenze');

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '33333333-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'una member non si promuove admin');

with u as (update public.profiles set display_name = 'Unissima' where id = '33333333-0000-4000-8000-0000000000a1' returning 1)
select is((select count(*)::int from u), 1, 'Uno cambia il proprio nome');

with u as (update public.profiles set display_name = 'Hack' where id = '33333333-0000-4000-8000-0000000000a2' returning 1)
select is((select count(*)::int from u), 0, 'Uno non cambia il nome di Due');

with u as (update public.words set label = 'Hack' returning 1)
select is((select count(*)::int from u), 0, 'una member non modifica la legenda');

with u as (update public.penance_assignments set status = 'done' returning done_at)
select ok((select done_at is not null from u), 'Uno segna fatta la propria penitenza (done_at dal server)');

-- ─────────────── Due e Admin sulle penitenze di Uno ───────────────
select set_config('request.jwt.claims', '{"sub":"33333333-0000-4000-8000-0000000000a2","role":"authenticated"}', true);

with u as (update public.penance_assignments set status = 'pending' returning 1)
select is((select count(*)::int from u), 0, 'Due non tocca le penitenze di Uno');

select set_config('request.jwt.claims', '{"sub":"33333333-0000-4000-8000-0000000000a0","role":"authenticated"}', true);

with u as (update public.penance_assignments set status = 'pending' returning done_at)
select ok((select done_at is null from u), 'l''admin può rimettere da fare la penitenza di un''altra');

select throws_ok(
  $$ update public.profiles set role = 'member' where id = '33333333-0000-4000-8000-0000000000a0' $$,
  '23514', null, 'l''ultima admin non può togliersi il ruolo');

-- ─────────────── anon ───────────────
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok($$ select * from public.stamps $$, '42501', null, 'anon non legge niente');

select * from finish();
rollback;
