-- Bad Words · notifiche push
--
-- 1. push_subscriptions: un record per dispositivo. Le gestisce solo il server (service role)
--    dopo aver verificato l'utente: nessun accesso diretto dal client.
-- 2. push_outbox: coda degli eventi da notificare, riempita dai trigger
--    (penitenza sbloccata, penitenza decisa, mese chiuso).
-- 3. Ogni insert nella coda chiama /api/push/flush via pg_net (dopo il commit), se nel Vault ci sono
--    `push_flush_url` e `push_flush_secret`. Senza, la coda la svuota comunque il cron giornaliero.

create extension if not exists pg_net with schema extensions;

-- ─────────────── Iscrizioni ───────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  group_id uuid not null,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  foreign key (profile_id, group_id) references public.profiles (id, group_id) on delete cascade
);
create index push_subscriptions_group_idx on public.push_subscriptions (group_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- ─────────────── Coda ───────────────
create table public.push_outbox (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  event text not null check (event in ('penance_unlocked', 'penance_decided', 'month_closed')),
  assignment_id uuid references public.penance_assignments (id) on delete cascade,
  month date,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check ((event = 'month_closed') = (month is not null and assignment_id is null))
);
create index push_outbox_pending_idx on public.push_outbox (id) where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

create function public.push_enqueue_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.kind = 'small' then
    insert into public.push_outbox (group_id, event, assignment_id) values (new.group_id, 'penance_unlocked', new.id);
  elsif tg_op = 'UPDATE' and old.custom_text is null and new.custom_text is not null then
    insert into public.push_outbox (group_id, event, assignment_id) values (new.group_id, 'penance_decided', new.id);
  end if;
  return null;
end;
$$;

create trigger penance_assignments_push
  after insert or update of custom_text on public.penance_assignments
  for each row execute function public.push_enqueue_assignment();

create function public.push_enqueue_closure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.push_outbox (group_id, event, month) values (new.group_id, 'month_closed', new.month);
  return null;
end;
$$;

create trigger month_closures_push
  after insert on public.month_closures
  for each row execute function public.push_enqueue_closure();

-- Un solo ping per istruzione (un timbro può sbloccare più soglie insieme).
create function public.push_ping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_flush_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_flush_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

create trigger push_outbox_ping
  after insert on public.push_outbox
  for each statement execute function public.push_ping();

-- Il server prende in carico gli eventi da inviare (al massimo una volta: skip locked).
create function public.claim_push_outbox(p_limit int default 200)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.push_outbox where sent_at < now() - interval '30 days';
  return query
  update public.push_outbox o
  set sent_at = now()
  where o.id in (
    select q.id from public.push_outbox q
    where q.sent_at is null
    order by q.id
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  )
  returning o.*;
end;
$$;

revoke execute on function public.push_enqueue_assignment(), public.push_enqueue_closure(), public.push_ping()
  from public, anon, authenticated;
revoke execute on function public.claim_push_outbox(int) from public, anon, authenticated;
grant execute on function public.claim_push_outbox(int) to service_role;
