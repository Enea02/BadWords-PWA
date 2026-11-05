-- Fine mese: last_seen_closure solo per sé.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(3);

insert into public.groups (id, name, invite_code) values ('77777777-0000-4000-8000-00000000000a', 'Gruppo F', 'TESTFM');
insert into auth.users (id, email) values
  ('77777777-0000-4000-8000-0000000000a0', 'admin@f.test'),
  ('77777777-0000-4000-8000-0000000000a1', 'uno@f.test');
insert into public.profiles (id, group_id, display_name, color, role) values
  ('77777777-0000-4000-8000-0000000000a0', '77777777-0000-4000-8000-00000000000a', 'Admin', 'fucsia', 'admin'),
  ('77777777-0000-4000-8000-0000000000a1', '77777777-0000-4000-8000-00000000000a', 'Uno', 'blu', 'member');

select set_config('request.jwt.claims', '{"sub":"77777777-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

with u as (update public.profiles set last_seen_closure = '2026-10-01' where id = '77777777-0000-4000-8000-0000000000a1' returning last_seen_closure)
select is((select last_seen_closure from u), '2026-10-01'::date, 'Uno segna di aver visto ottobre');

select throws_ok(
  $$ update public.profiles set last_seen_closure = '2026-10-15' where id = '77777777-0000-4000-8000-0000000000a1' $$,
  '23514', null, 'deve essere il primo del mese');

select set_config('request.jwt.claims', '{"sub":"77777777-0000-4000-8000-0000000000a0","role":"authenticated"}', true);
select throws_ok(
  $$ update public.profiles set last_seen_closure = null where id = '77777777-0000-4000-8000-0000000000a1' $$,
  '42501', null, 'l''admin non lo cambia per le altre');

select * from finish();
rollback;
