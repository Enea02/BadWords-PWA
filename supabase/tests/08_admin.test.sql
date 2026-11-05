-- Admin: soglia configurabile, codice invito, legenda e mazzo riservati all'admin.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(13);

insert into public.groups (id, name, invite_code, penance_every) values
  ('88888888-0000-4000-8000-00000000000a', 'Gruppo H', 'TESTHA', 5);
insert into auth.users (id, email) values
  ('88888888-0000-4000-8000-0000000000a0', 'admin@h.test'),
  ('88888888-0000-4000-8000-0000000000a1', 'uno@h.test');
insert into public.profiles (id, group_id, display_name, color, role) values
  ('88888888-0000-4000-8000-0000000000a0', '88888888-0000-4000-8000-00000000000a', 'Admin', 'fucsia', 'admin'),
  ('88888888-0000-4000-8000-0000000000a1', '88888888-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member');
select public.seed_group_defaults('88888888-0000-4000-8000-00000000000a');

-- ─────────────── Soglia a 5 ───────────────
insert into public.stamps (group_id, profile_id, word_id, created_by)
select '88888888-0000-4000-8000-00000000000a', '88888888-0000-4000-8000-0000000000a1',
       (select id from public.words where group_id = '88888888-0000-4000-8000-00000000000a' order by sort_order limit 1),
       '88888888-0000-4000-8000-0000000000a1'
from generate_series(1, 12);

select results_eq(
  $$ select threshold from public.penance_assignments where profile_id = '88888888-0000-4000-8000-0000000000a1' order by threshold $$,
  $$ values (5), (10) $$,
  'con soglia 5: penitenze a 5 e 10 timbri');

select throws_ok(
  $$ update public.groups set penance_every = 7 where id = '88888888-0000-4000-8000-00000000000a' $$,
  '23514', null, 'la soglia va a passi di 5');

select throws_ok(
  $$ update public.groups set penance_every = 35 where id = '88888888-0000-4000-8000-00000000000a' $$,
  '23514', null, 'la soglia massima è 30');

-- ─────────────── Member ───────────────
select set_config('request.jwt.claims', '{"sub":"88888888-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$ select public.regenerate_invite_code() $$, '42501', null, 'una member non rigenera il codice');

with u as (update public.groups set penance_every = 20 returning 1)
select is((select count(*)::int from u), 0, 'una member non cambia la soglia');

with u as (update public.words set label = 'Hack' returning 1)
select is((select count(*)::int from u), 0, 'una member non modifica la legenda');

select throws_ok(
  $$ insert into public.words (group_id, label, icon) values ('88888888-0000-4000-8000-00000000000a', 'Nuova', 'bomba') $$,
  '42501', null, 'una member non aggiunge voci');

select throws_ok(
  $$ insert into public.penances (group_id, kind, text) values ('88888888-0000-4000-8000-00000000000a', 'small', 'Nuova') $$,
  '42501', null, 'una member non aggiunge penitenze');

-- ─────────────── Admin ───────────────
select set_config('request.jwt.claims', '{"sub":"88888888-0000-4000-8000-0000000000a0","role":"authenticated"}', true);

select matches(public.regenerate_invite_code(), '^[A-HJ-NP-Z2-9]{6}$', 'l''admin rigenera il codice (senza caratteri ambigui)');
select isnt((select invite_code from public.groups), 'TESTHA', 'il vecchio codice non vale più');

with u as (update public.groups set penance_every = 15 returning penance_every)
select is((select penance_every from u), 15, 'l''admin cambia la soglia');

with u as (
  update public.words set sort_order = 99, active = false
  where group_id = '88888888-0000-4000-8000-00000000000a' and icon = 'peperoncino' returning 1
)
select is((select count(*)::int from u), 1, 'l''admin riordina e disattiva una voce');

with u as (update public.penances set active = false where kind = 'monthly' returning 1)
select is((select count(*)::int from u), 3, 'l''admin toglie dal mazzo (disattiva) le penitenze');

select * from finish();
rollback;
