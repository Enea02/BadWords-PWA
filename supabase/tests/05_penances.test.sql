-- Penitenze: segna come fatta (interessata / admin), rimetti da fare, conferma di lettura.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(9);

-- Fixture propria (non dipende dai dati locali): admin a0, Uno a1 (arriva a 10), Due a2.
insert into public.groups (id, name, invite_code) values ('55555555-0000-4000-8000-00000000000a', 'Gruppo P', 'TESTPP');
insert into auth.users (id, email) values
  ('55555555-0000-4000-8000-0000000000a0', 'admin@p.test'),
  ('55555555-0000-4000-8000-0000000000a1', 'uno@p.test'),
  ('55555555-0000-4000-8000-0000000000a2', 'due@p.test');
insert into public.profiles (id, group_id, display_name, color, role) values
  ('55555555-0000-4000-8000-0000000000a0', '55555555-0000-4000-8000-00000000000a', 'Admin', 'fucsia', 'admin'),
  ('55555555-0000-4000-8000-0000000000a1', '55555555-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member'),
  ('55555555-0000-4000-8000-0000000000a2', '55555555-0000-4000-8000-00000000000a', 'Due', 'verde', 'member');
select public.seed_group_defaults('55555555-0000-4000-8000-00000000000a');

insert into public.stamps (group_id, profile_id, word_id, created_by)
select '55555555-0000-4000-8000-00000000000a', '55555555-0000-4000-8000-0000000000a1',
       (select id from public.words where group_id = '55555555-0000-4000-8000-00000000000a' order by sort_order limit 1),
       '55555555-0000-4000-8000-0000000000a1'
from generate_series(1, 10);

create temporary table _a as
select id from public.penance_assignments where profile_id = '55555555-0000-4000-8000-0000000000a1';
grant select on _a to authenticated;

select is((select count(*)::int from _a), 1, 'Uno ha una penitenza da 10');

-- ─────────────── Due (member) ───────────────
select set_config('request.jwt.claims', '{"sub":"55555555-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;

with u as (update public.penance_assignments set status = 'done' where id = (select id from _a) returning 1)
select is((select count(*)::int from u), 0, 'Due non segna fatta la penitenza di Uno');

with u as (update public.penance_assignments set acknowledged_at = now() where id = (select id from _a) returning 1)
select is((select count(*)::int from u), 0, 'Due non conferma la lettura per Uno (riga filtrata dalla RLS)');

-- ─────────────── Uno ───────────────
select set_config('request.jwt.claims', '{"sub":"55555555-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

with u as (update public.penance_assignments set acknowledged_at = '2000-01-01' where id = (select id from _a) returning acknowledged_at)
select ok((select acknowledged_at > now() - interval '1 minute' from u), 'Uno conferma la lettura (data messa dal server)');

with u as (update public.penance_assignments set status = 'done' where id = (select id from _a) returning status::text, done_at)
select ok((select status = 'done' and done_at is not null from u), 'Uno segna fatta la sua penitenza');

with u as (update public.penance_assignments set status = 'pending' where id = (select id from _a) returning done_at)
select ok((select done_at is null from u), 'Uno la rimette da fare (annulla)');

-- ─────────────── Admin (admin) ───────────────
select set_config('request.jwt.claims', '{"sub":"55555555-0000-4000-8000-0000000000a0","role":"authenticated"}', true);

with u as (update public.penance_assignments set status = 'done' where id = (select id from _a) returning status::text)
select is((select status from u), 'done', 'l''admin segna fatta la penitenza di Uno');

select throws_ok(
  $$ update public.penance_assignments set acknowledged_at = null where id = (select id from _a) $$,
  '42501', null, 'nemmeno l''admin tocca la conferma di lettura di Uno');

select throws_ok(
  $$ update public.penance_assignments set threshold = 30 where id = (select id from _a) $$,
  '42501', null, 'le altre colonne non sono modificabili');

select * from finish();
rollback;
