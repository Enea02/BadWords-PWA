-- Swear Jar · sicurezza
-- Regola generale: si legge solo il proprio gruppo; si scrive solo ciò che serve, colonna per colonna.

-- ─────────────── Helper per le policy ───────────────
-- security definer: leggono profiles senza ricorsione nella sua stessa RLS.

create function public.my_group_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.group_id from public.profiles p where p.id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ─────────────── Permessi di base ───────────────
-- Supabase concede tutto ad anon/authenticated per default: si riparte da zero.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- …e anche per gli oggetti creati dalle migrazioni future: ogni permesso va concesso esplicitamente.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

grant execute on function public.my_group_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.month_start(timestamptz, text) to authenticated;

-- Chiusura del mese: solo server (service_role).
grant execute on function public.close_month(uuid, date) to service_role;
grant execute on function public.close_pending_months() to service_role;
grant execute on function public.month_totals(uuid, date) to service_role;

alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.stamps enable row level security;
alter table public.penances enable row level security;
alter table public.penance_assignments enable row level security;
alter table public.month_closures enable row level security;

-- ─────────────── groups ───────────────
grant select on public.groups to authenticated;
grant update (name, invite_code) on public.groups to authenticated;

create policy "groups: lettura del proprio gruppo" on public.groups
  for select to authenticated
  using (id = (select public.my_group_id()));

create policy "groups: modifica solo admin" on public.groups
  for update to authenticated
  using (id = (select public.my_group_id()) and (select public.is_admin()))
  with check (id = (select public.my_group_id()));

-- ─────────────── profiles ───────────────
-- L'ingresso nel gruppo passa da una RPC (fase 2). group_id non è mai modificabile dai client.
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, color, role) on public.profiles to authenticated;

create policy "profiles: lettura del proprio gruppo" on public.profiles
  for select to authenticated
  using (group_id = (select public.my_group_id()));

-- Ognuna modifica sé stessa; l'admin tutte. Il cambio di ruolo è filtrato dal trigger profiles_guard_role.
create policy "profiles: modifica di sé o admin" on public.profiles
  for update to authenticated
  using (
    group_id = (select public.my_group_id())
    and (id = (select auth.uid()) or (select public.is_admin()))
  )
  with check (group_id = (select public.my_group_id()));

-- ─────────────── words ───────────────
grant select on public.words to authenticated;
grant insert (group_id, label, icon, sort_order, active) on public.words to authenticated;
grant update (label, icon, sort_order, active) on public.words to authenticated;

create policy "words: lettura del proprio gruppo" on public.words
  for select to authenticated
  using (group_id = (select public.my_group_id()));

create policy "words: inserimento solo admin" on public.words
  for insert to authenticated
  with check (group_id = (select public.my_group_id()) and (select public.is_admin()));

create policy "words: modifica solo admin" on public.words
  for update to authenticated
  using (group_id = (select public.my_group_id()) and (select public.is_admin()))
  with check (group_id = (select public.my_group_id()));

-- ─────────────── penances ───────────────
grant select on public.penances to authenticated;
grant insert (group_id, kind, text, active) on public.penances to authenticated;
grant update (kind, text, active) on public.penances to authenticated;

create policy "penances: lettura del proprio gruppo" on public.penances
  for select to authenticated
  using (group_id = (select public.my_group_id()));

create policy "penances: inserimento solo admin" on public.penances
  for insert to authenticated
  with check (group_id = (select public.my_group_id()) and (select public.is_admin()));

create policy "penances: modifica solo admin" on public.penances
  for update to authenticated
  using (group_id = (select public.my_group_id()) and (select public.is_admin()))
  with check (group_id = (select public.my_group_id()));

-- ─────────────── stamps ───────────────
-- Niente DELETE: si annulla con voided_at.
grant select on public.stamps to authenticated;
grant insert (group_id, profile_id, word_id, created_by) on public.stamps to authenticated;
grant update (voided_at, voided_by) on public.stamps to authenticated;

create policy "stamps: lettura del proprio gruppo" on public.stamps
  for select to authenticated
  using (group_id = (select public.my_group_id()));

-- Si timbra per sé o per le altre del gruppo, firmando come sé stesse.
-- Le FK composite garantiscono che ragazza e parolaccia siano dello stesso gruppo.
create policy "stamps: timbra nel proprio gruppo" on public.stamps
  for insert to authenticated
  with check (
    group_id = (select public.my_group_id())
    and created_by = (select auth.uid())
  );

-- Annulla: l'autrice entro 5 minuti, dopo solo l'admin. Un timbro annullato resta annullato.
create policy "stamps: annulla autrice 5 min o admin" on public.stamps
  for update to authenticated
  using (
    group_id = (select public.my_group_id())
    and voided_at is null
    and (
      (created_by = (select auth.uid()) and created_at > now() - interval '5 minutes')
      or (select public.is_admin())
    )
  )
  with check (
    group_id = (select public.my_group_id())
    and voided_at is not null
    and voided_by = (select auth.uid())
  );

-- ─────────────── penance_assignments ───────────────
-- Create solo dai trigger/RPC. I client possono solo segnarle fatte (o rimetterle da fare).
grant select on public.penance_assignments to authenticated;
grant update (status) on public.penance_assignments to authenticated;

create policy "assignments: lettura del proprio gruppo" on public.penance_assignments
  for select to authenticated
  using (group_id = (select public.my_group_id()));

create policy "assignments: segna fatta interessata o admin" on public.penance_assignments
  for update to authenticated
  using (
    group_id = (select public.my_group_id())
    and (profile_id = (select auth.uid()) or (select public.is_admin()))
  )
  with check (group_id = (select public.my_group_id()));

-- ─────────────── month_closures ───────────────
grant select on public.month_closures to authenticated;

create policy "closures: lettura del proprio gruppo" on public.month_closures
  for select to authenticated
  using (group_id = (select public.my_group_id()));

-- ─────────────── monthly_board ───────────────
grant select on public.monthly_board to authenticated;

-- ─────────────── Realtime ───────────────
-- postgres_changes rispetta la RLS: ognuna riceve solo gli eventi del proprio gruppo.
alter publication supabase_realtime add table public.stamps, public.penance_assignments;
