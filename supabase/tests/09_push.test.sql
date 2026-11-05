-- Notifiche push: coda degli eventi, ping via pg_net, tabelle chiuse ai client.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(13);

insert into public.groups (id, name, invite_code, penance_mode) values
  ('99999999-0000-4000-8000-00000000000a', 'Gruppo P', 'TESTPA', 'custom');
insert into auth.users (id, email) values
  ('99999999-0000-4000-8000-0000000000a0', 'admin@p.test'),
  ('99999999-0000-4000-8000-0000000000a1', 'uno@p.test');
insert into public.profiles (id, group_id, display_name, color, role) values
  ('99999999-0000-4000-8000-0000000000a0', '99999999-0000-4000-8000-00000000000a', 'Admin', 'fucsia', 'admin'),
  ('99999999-0000-4000-8000-0000000000a1', '99999999-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member');
select public.seed_group_defaults('99999999-0000-4000-8000-00000000000a');

-- Coda vuota e webhook non configurato per questo test (i dati locali non contano; tutto in rollback).
delete from vault.secrets where name in ('push_flush_url', 'push_flush_secret');
delete from net.http_request_queue;
update public.push_outbox set sent_at = now() where sent_at is null;

-- ─────────────── Penitenza sbloccata ───────────────
insert into public.stamps (group_id, profile_id, word_id, created_by)
select '99999999-0000-4000-8000-00000000000a', '99999999-0000-4000-8000-0000000000a1',
       (select id from public.words where group_id = '99999999-0000-4000-8000-00000000000a' order by sort_order limit 1),
       '99999999-0000-4000-8000-0000000000a1'
from generate_series(1, 10);

create temp table _a as
  select id from public.penance_assignments where profile_id = '99999999-0000-4000-8000-0000000000a1' and threshold = 10;
grant select on _a to authenticated;

select results_eq(
  $$ select event, assignment_id from public.push_outbox where group_id = '99999999-0000-4000-8000-00000000000a' $$,
  $$ select 'penance_unlocked'::text, id from _a $$,
  'al decimo timbro: un evento penance_unlocked');

-- ─────────────── Decisa dall'admin ───────────────
select set_config('request.jwt.claims', '{"sub":"99999999-0000-4000-8000-0000000000a0","role":"authenticated"}', true);
set local role authenticated;
update public.penance_assignments set custom_text = 'Canta.' where id = (select id from _a);
update public.penance_assignments set custom_text = 'Canta forte.' where id = (select id from _a);

select throws_ok($$ select * from public.push_outbox $$, '42501', null, 'la coda non si legge dal client');
select throws_ok($$ select * from public.push_subscriptions $$, '42501', null, 'le iscrizioni non si leggono dal client');
select throws_ok(
  $$ insert into public.push_subscriptions (profile_id, group_id, endpoint, p256dh, auth)
     values ('99999999-0000-4000-8000-0000000000a0', '99999999-0000-4000-8000-00000000000a', 'https://x', 'k', 'a') $$,
  '42501', null, 'le iscrizioni non si scrivono dal client');
reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.push_outbox where event = 'penance_decided' and assignment_id = (select id from _a)),
  1, 'decisa: un solo evento, la correzione non rinotifica');

-- ─────────────── Mese chiuso ───────────────
insert into public.month_closures (group_id, month, snapshot)
values ('99999999-0000-4000-8000-00000000000a', '2026-01-01', '[]');
select is(
  (select count(*)::int from public.push_outbox where event = 'month_closed' and month = '2026-01-01'),
  1, 'mese chiuso: un evento');

-- ─────────────── Presa in carico ───────────────
select ok(not has_function_privilege('authenticated', 'public.claim_push_outbox(int)', 'execute'), 'claim negata alle utenti');
select ok(not has_function_privilege('anon', 'public.claim_push_outbox(int)', 'execute'), 'claim negata agli anonimi');
select ok(has_function_privilege('service_role', 'public.claim_push_outbox(int)', 'execute'), 'claim per il server');

select is((select count(*)::int from public.claim_push_outbox()), 3, 'la claim prende i tre eventi');
select is((select count(*)::int from public.claim_push_outbox()), 0, 'una seconda claim non li riprende');

-- ─────────────── Ping ───────────────
select is(
  (select count(*)::int from net.http_request_queue),
  0, 'senza URL nel Vault nessuna chiamata');

select vault.create_secret('http://example.test/api/push/flush', 'push_flush_url');
select vault.create_secret('segreto-di-prova', 'push_flush_secret');
insert into public.month_closures (group_id, month, snapshot)
values ('99999999-0000-4000-8000-00000000000a', '2026-02-01', '[]');
select is(
  (select count(*)::int from net.http_request_queue
   where url = 'http://example.test/api/push/flush' and headers ->> 'Authorization' = 'Bearer segreto-di-prova'),
  1, 'con URL e secret nel Vault: un ping al server');

select * from finish();
rollback;
