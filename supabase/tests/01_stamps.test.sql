-- Timbri: soglie 10/20, annullamento, regola dei 5 minuti, mese in Europe/Rome.
begin;
create extension if not exists pgtap with schema extensions;
-- pgTAP va chiamato anche mentre si impersona `authenticated` (rollback a fine file).
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(19);

-- ─────────────── Fixture (come postgres) ───────────────
insert into public.groups (id, name, invite_code) values
  ('11111111-0000-4000-8000-00000000000a', 'Gruppo A', 'TESTAA');

insert into auth.users (id, email) values
  ('11111111-0000-4000-8000-0000000000a0', 'admin@a.test'),
  ('11111111-0000-4000-8000-0000000000a1', 'uno@a.test'),
  ('11111111-0000-4000-8000-0000000000a2', 'due@a.test');

insert into public.profiles (id, group_id, display_name, color, role) values
  ('11111111-0000-4000-8000-0000000000a0', '11111111-0000-4000-8000-00000000000a', 'Admin', 'magenta', 'admin'),
  ('11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member'),
  ('11111111-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-00000000000a', 'Due', 'verde', 'member');

insert into public.words (id, group_id, label, icon) values
  ('11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-00000000000a', 'Cosa', 'nuvola'),
  ('11111111-0000-4000-8000-0000000000c2', '11111111-0000-4000-8000-00000000000a', 'Spenta', 'bomba');
update public.words set active = false where id = '11111111-0000-4000-8000-0000000000c2';

insert into public.penances (group_id, kind, text) values
  ('11111111-0000-4000-8000-00000000000a', 'small', 'Piccola 1'),
  ('11111111-0000-4000-8000-00000000000a', 'small', 'Piccola 2'),
  ('11111111-0000-4000-8000-00000000000a', 'monthly', 'Grossa');

-- ─────────────── Soglie (come Uno) ───────────────
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

insert into public.stamps (group_id, profile_id, word_id, created_by)
select '11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
       '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1'
from generate_series(1, 9);

select is(
  (select count(*)::int from public.penance_assignments where profile_id = '11111111-0000-4000-8000-0000000000a1'),
  0, '9 timbri: nessuna penitenza');

insert into public.stamps (group_id, profile_id, word_id, created_by) values
  ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
   '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1');

select results_eq(
  $$ select kind::text, threshold from public.penance_assignments
     where profile_id = '11111111-0000-4000-8000-0000000000a1' $$,
  $$ values ('small', 10) $$,
  '10° timbro: penitenza piccola con soglia 10');

select ok(
  (select p.kind = 'small' and p.group_id = '11111111-0000-4000-8000-00000000000a'
   from public.penance_assignments a join public.penances p on p.id = a.penance_id
   where a.profile_id = '11111111-0000-4000-8000-0000000000a1' and a.threshold = 10),
  'la penitenza è estratta dal mazzo piccolo del gruppo');

insert into public.stamps (group_id, profile_id, word_id, created_by)
select '11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
       '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1'
from generate_series(1, 10);

select results_eq(
  $$ select threshold from public.penance_assignments
     where profile_id = '11111111-0000-4000-8000-0000000000a1' order by threshold $$,
  $$ values (10), (20) $$,
  '20° timbro: seconda penitenza con soglia 20');

select is(
  (select stamps from public.monthly_board where profile_id = '11111111-0000-4000-8000-0000000000a1'),
  20, 'monthly_board conta 20 timbri');

-- ─────────────── Annullamento ───────────────
with u as (
  update public.stamps set voided_at = now()
  where id = (select id from public.stamps where profile_id = '11111111-0000-4000-8000-0000000000a1'
              and voided_at is null limit 1)
  returning voided_by
)
select is((select count(*)::int from u where voided_by = '11111111-0000-4000-8000-0000000000a1'),
  1, 'l''autrice annulla entro 5 minuti (voided_by = lei)');

select is(
  (select stamps from public.monthly_board where profile_id = '11111111-0000-4000-8000-0000000000a1'),
  19, 'il timbro annullato non conta più');

select is(
  (select count(*)::int from public.penance_assignments where profile_id = '11111111-0000-4000-8000-0000000000a1'),
  2, 'sotto soglia la penitenza da 20 resta');

insert into public.stamps (group_id, profile_id, word_id, created_by) values
  ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
   '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1');

select is(
  (select count(*)::int from public.penance_assignments where profile_id = '11111111-0000-4000-8000-0000000000a1'),
  2, 'tornare a 20 non crea un duplicato');

with u as (
  update public.stamps set voided_at = null
  where profile_id = '11111111-0000-4000-8000-0000000000a1' and voided_at is not null
  returning 1
)
select is((select count(*)::int from u), 0, 'un timbro annullato non si ripristina');

select throws_ok(
  $$ delete from public.stamps where profile_id = '11111111-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'DELETE sui timbri è vietato');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by, created_at) values
     ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
      '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1', now() - interval '40 days') $$,
  '42501', null, 'i client non possono retrodatare un timbro');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
      '11111111-0000-4000-8000-0000000000c2', '11111111-0000-4000-8000-0000000000a1') $$,
  '23514', null, 'non si timbra una parolaccia disattivata');

-- ─────────────── Timbrare per le altre (come Due) ───────────────
select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-0000000000a2","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
      '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a2') $$,
  'Due timbra per Uno, firmando come sé stessa');

select throws_ok(
  $$ insert into public.stamps (group_id, profile_id, word_id, created_by) values
     ('11111111-0000-4000-8000-00000000000a', '11111111-0000-4000-8000-0000000000a1',
      '11111111-0000-4000-8000-0000000000c1', '11111111-0000-4000-8000-0000000000a1') $$,
  '42501', null, 'non si firma a nome di un''altra (created_by)');

with u as (
  update public.stamps set voided_at = now()
  where profile_id = '11111111-0000-4000-8000-0000000000a1'
    and created_by = '11111111-0000-4000-8000-0000000000a1' and voided_at is null
  returning 1
)
select is((select count(*)::int from u), 0, 'Due non annulla i timbri messi da Uno');

-- ─────────────── Oltre i 5 minuti ───────────────
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.stamps (id, group_id, profile_id, word_id, created_by, created_at) values
  ('11111111-0000-4000-8000-0000000000d1', '11111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-0000000000c1',
   '11111111-0000-4000-8000-0000000000a1', now() - interval '6 minutes');

select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

with u as (
  update public.stamps set voided_at = now() where id = '11111111-0000-4000-8000-0000000000d1' returning 1
)
select is((select count(*)::int from u), 0, 'dopo 5 minuti l''autrice non può più annullare');

select set_config('request.jwt.claims', '{"sub":"11111111-0000-4000-8000-0000000000a0","role":"authenticated"}', true);

with u as (
  update public.stamps set voided_at = now() where id = '11111111-0000-4000-8000-0000000000d1' returning voided_by
)
select is((select voided_by from u), '11111111-0000-4000-8000-0000000000a0'::uuid,
  'l''admin annulla anche dopo 5 minuti');

-- ─────────────── Mese in ora italiana ───────────────
reset role;
select set_config('request.jwt.claims', '', true);

insert into public.stamps (id, group_id, profile_id, word_id, created_at) values
  ('11111111-0000-4000-8000-0000000000d2', '11111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-0000000000c1', '2026-10-31 22:59:00+00'),
  ('11111111-0000-4000-8000-0000000000d3', '11111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-0000000000c1', '2026-10-31 23:30:00+00');

select results_eq(
  $$ select month from public.stamps
     where id in ('11111111-0000-4000-8000-0000000000d2', '11111111-0000-4000-8000-0000000000d3')
     order by created_at $$,
  $$ values ('2026-10-01'::date), ('2026-11-01'::date) $$,
  '23:59 del 31/10 a Roma è ottobre, 00:30 del 1/11 è novembre');

select * from finish();
rollback;
