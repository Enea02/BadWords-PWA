-- Penitenze decise sul momento: solo l'admin scrive il testo, non si sconta prima della decisione.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(11);

-- Fixture: gruppo C in modalità custom (admin a0, Uno a1), gruppo D dal mazzo (admin d0).
insert into public.groups (id, name, invite_code, penance_mode, created_at) values
  ('66666666-0000-4000-8000-00000000000c', 'Gruppo C', 'TESTMC', 'custom', now() - interval '2 months'),
  ('66666666-0000-4000-8000-00000000000d', 'Gruppo D', 'TESTMD', 'deck', now());
insert into auth.users (id, email) values
  ('66666666-0000-4000-8000-0000000000a0', 'admin@c6.test'),
  ('66666666-0000-4000-8000-0000000000a1', 'uno@c6.test'),
  ('66666666-0000-4000-8000-0000000000d0', 'admin@d6.test');
insert into public.profiles (id, group_id, display_name, color, role) values
  ('66666666-0000-4000-8000-0000000000a0', '66666666-0000-4000-8000-00000000000c', 'Admin', 'fucsia', 'admin'),
  ('66666666-0000-4000-8000-0000000000a1', '66666666-0000-4000-8000-00000000000c', 'Uno', 'blu', 'member'),
  ('66666666-0000-4000-8000-0000000000d0', '66666666-0000-4000-8000-00000000000d', 'AdminD', 'verde', 'admin');
select public.seed_group_defaults('66666666-0000-4000-8000-00000000000c');
select public.seed_group_defaults('66666666-0000-4000-8000-00000000000d');

insert into public.stamps (group_id, profile_id, word_id, created_by)
select '66666666-0000-4000-8000-00000000000c', '66666666-0000-4000-8000-0000000000a1',
       (select id from public.words where group_id = '66666666-0000-4000-8000-00000000000c' order by sort_order limit 1),
       '66666666-0000-4000-8000-0000000000a1'
from generate_series(1, 10);

insert into public.stamps (group_id, profile_id, word_id, created_by)
select '66666666-0000-4000-8000-00000000000d', '66666666-0000-4000-8000-0000000000d0',
       (select id from public.words where group_id = '66666666-0000-4000-8000-00000000000d' order by sort_order limit 1),
       '66666666-0000-4000-8000-0000000000d0'
from generate_series(1, 10);

create temporary table _c as
select id from public.penance_assignments where profile_id = '66666666-0000-4000-8000-0000000000a1';
create temporary table _d as
select id from public.penance_assignments where profile_id = '66666666-0000-4000-8000-0000000000d0';
grant select on _c, _d to authenticated;

select results_eq(
  $$ select custom, penance_id is null, custom_text is null from public.penance_assignments where id = (select id from _c) $$,
  $$ values (true, true, true) $$,
  'modalità custom: penitenza creata senza estrazione dal mazzo');

select ok(
  (select not custom and penance_id is not null from public.penance_assignments where id = (select id from _d)),
  'modalità mazzo: estratta come prima');

-- ─────────────── Uno (member, interessata) ───────────────
select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ update public.penance_assignments set custom_text = 'Niente' where id = (select id from _c) $$,
  '42501', null, 'l''interessata (member) non decide la propria penitenza');

select throws_ok(
  $$ update public.penance_assignments set status = 'done' where id = (select id from _c) $$,
  '23514', null, 'non si sconta una penitenza ancora da decidere');

with u as (update public.groups set penance_mode = 'deck' returning 1)
select is((select count(*)::int from u), 0, 'una member non cambia la modalità del gruppo');

-- ─────────────── Admin ───────────────
select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-0000000000a0","role":"authenticated"}', true);

with u as (
  update public.penance_assignments set custom_text = '  Canta in piazza.  ' where id = (select id from _c)
  returning custom_text, decided_by, decided_at
)
select ok(
  (select custom_text = 'Canta in piazza.' and decided_by = '66666666-0000-4000-8000-0000000000a0' and decided_at is not null from u),
  'l''admin decide: testo ripulito, decided_by e decided_at dal server');

with u as (update public.penance_assignments set custom_text = 'Canta in piazza, due volte.' where id = (select id from _c) returning custom_text)
select is((select custom_text from u), 'Canta in piazza, due volte.', 'l''admin può correggerla');

select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
with u as (update public.penance_assignments set status = 'done' where id = (select id from _c) returning status::text)
select is((select status from u), 'done', 'decisa: l''interessata la segna come fatta');

-- ─────────────── Mazzo: niente testo libero ───────────────
select set_config('request.jwt.claims', '{"sub":"66666666-0000-4000-8000-0000000000d0","role":"authenticated"}', true);
select throws_ok(
  $$ update public.penance_assignments set custom_text = 'Altro' where id = (select id from _d) $$,
  '23514', null, 'una penitenza dal mazzo non si riscrive');

-- ─────────────── Chiusura mese in modalità custom ───────────────
reset role;
select set_config('request.jwt.claims', '', true);

insert into public.stamps (group_id, profile_id, word_id, created_at)
select '66666666-0000-4000-8000-00000000000c', '66666666-0000-4000-8000-0000000000a0',
       (select id from public.words where group_id = '66666666-0000-4000-8000-00000000000c' order by sort_order limit 1),
       (public.month_start(now(), 'Europe/Rome') - interval '15 days')::timestamp at time zone 'Europe/Rome';

select lives_ok(
  $$ select public.close_month('66666666-0000-4000-8000-00000000000c', (public.month_start(now(), 'Europe/Rome') - interval '1 month')::date) $$,
  'chiusura del mese scorso del gruppo custom');

select results_eq(
  $$ select custom, penance_id is null from public.penance_assignments
     where kind = 'monthly' and profile_id = '66666666-0000-4000-8000-0000000000a0' $$,
  $$ values (true, true) $$,
  'anche la grossa del mese è da decidere');

select * from finish();
rollback;
