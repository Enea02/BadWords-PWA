-- Swear Jar · penitenze dal mazzo oppure decise sul momento dall'admin
-- groups.penance_mode: 'deck' = estratta a caso dal mazzo (default); 'custom' = la scrive l'admin quando scatta.
-- Vale per le penitenze piccole (10, 20, 30…) e per la grossa di fine mese.

create type public.penance_mode as enum ('deck', 'custom');

alter table public.groups add column penance_mode public.penance_mode not null default 'deck';
grant update (penance_mode) on public.groups to authenticated; -- la policy limita già all'admin

-- custom = creata in modalità "sul momento": finché custom_text è null è "da decidere".
alter table public.penance_assignments
  add column custom boolean not null default false,
  add column custom_text text check (custom_text is null or char_length(btrim(custom_text)) between 1 and 200),
  add column decided_by uuid,
  add column decided_at timestamptz,
  add foreign key (decided_by, group_id) references public.profiles (id, group_id) on delete set null (decided_by);

grant update (custom_text) on public.penance_assignments to authenticated;

-- ─────────────── Estrazione: dal mazzo solo in modalità deck ───────────────
create or replace function public.stamps_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_threshold int;
  v_custom boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text || ':' || new.month::text, 0));

  select count(*) into v_total
  from public.stamps s
  where s.profile_id = new.profile_id
    and s.month = new.month
    and s.voided_at is null;

  select g.penance_mode = 'custom' into v_custom from public.groups g where g.id = new.group_id;

  v_threshold := 10;
  while v_threshold <= v_total loop
    insert into public.penance_assignments (group_id, profile_id, kind, month, threshold, penance_id, custom)
    values (
      new.group_id,
      new.profile_id,
      'small',
      new.month,
      v_threshold,
      case when v_custom then null else (
        select p.id from public.penances p
        where p.group_id = new.group_id and p.kind = 'small' and p.active
        order by random()
        limit 1
      ) end,
      v_custom
    )
    on conflict on constraint penance_assignments_once do nothing;
    v_threshold := v_threshold + 10;
  end loop;

  return null;
end;
$$;

-- ─────────────── Chiusura mese: stessa regola per la grossa ───────────────
create or replace function public.close_month(p_group uuid, p_month date)
returns public.month_closures
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_custom boolean;
  v_closure public.month_closures;
  v_max int;
  v_penance uuid;
  v_snapshot jsonb;
begin
  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'p_month deve essere il primo giorno del mese' using errcode = 'invalid_parameter_value';
  end if;

  select g.timezone, g.penance_mode = 'custom' into v_tz, v_custom from public.groups g where g.id = p_group;
  if v_tz is null then
    raise exception 'Gruppo inesistente' using errcode = 'no_data_found';
  end if;

  if p_month >= public.month_start(now(), v_tz) then
    raise exception 'Il mese % non è ancora finito', p_month using errcode = 'invalid_parameter_value';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('close:' || p_group::text || ':' || p_month::text, 0));

  select * into v_closure from public.month_closures c where c.group_id = p_group and c.month = p_month;
  if found then
    return v_closure;
  end if;

  select coalesce(max(t.total), 0) into v_max from public.month_totals(p_group, p_month) t;

  if v_max > 0 then
    if not v_custom then
      select p.id into v_penance
      from public.penances p
      where p.group_id = p_group and p.kind = 'monthly' and p.active
      order by random()
      limit 1;
    end if;

    insert into public.penance_assignments (group_id, profile_id, kind, month, threshold, penance_id, custom)
    select p_group, t.profile_id, 'monthly', p_month, null, v_penance, v_custom
    from public.month_totals(p_group, p_month) t
    where t.total = v_max
    on conflict on constraint penance_assignments_once do nothing;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', r.profile_id,
        'display_name', r.display_name,
        'color', r.color,
        'total', r.total,
        'rank', r.rank
      )
      order by r.total desc, r.display_name
    ),
    '[]'::jsonb
  )
  into v_snapshot
  from (
    select t.*, dense_rank() over (order by t.total desc)::int as rank
    from public.month_totals(p_group, p_month) t
  ) r;

  insert into public.month_closures (group_id, month, snapshot)
  values (p_group, p_month, v_snapshot)
  returning * into v_closure;

  return v_closure;
end;
$$;

-- ─────────────── Regole sugli aggiornamenti ───────────────
create or replace function public.penance_assignments_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin boolean;
begin
  v_admin := exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.group_id = old.group_id and p.role = 'admin'
  );

  -- Testo deciso sul momento: solo l'admin, solo per le penitenze "custom".
  if new.custom_text is distinct from old.custom_text then
    if auth.uid() is not null and not v_admin then
      raise exception 'Solo l''admin decide la penitenza' using errcode = 'insufficient_privilege';
    end if;
    if not old.custom then
      raise exception 'Questa penitenza viene dal mazzo' using errcode = 'check_violation';
    end if;
    new.custom_text := nullif(btrim(new.custom_text), '');
    new.decided_by := auth.uid();
    new.decided_at := case when new.custom_text is null then null else now() end;
  end if;

  -- Non si sconta una penitenza ancora da decidere.
  if new.status = 'done' and old.status is distinct from 'done' then
    if new.custom and new.custom_text is null then
      raise exception 'La penitenza non è ancora stata decisa' using errcode = 'check_violation';
    end if;
    new.done_at := now();
  elsif new.status = 'pending' then
    new.done_at := null;
  end if;

  if new.acknowledged_at is distinct from old.acknowledged_at then
    if auth.uid() is not null and auth.uid() <> old.profile_id then
      raise exception 'Solo l''interessata conferma di aver visto la penitenza' using errcode = 'insufficient_privilege';
    end if;
    if new.acknowledged_at is not null then
      new.acknowledged_at := coalesce(old.acknowledged_at, now());
    end if;
  end if;

  return new;
end;
$$;
