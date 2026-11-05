-- Swear Jar · chiusura del mese
-- Solo service_role (route /api/cron/close-month).

-- Totale di timbri validi per ogni ragazza del gruppo in un mese (anche 0).
create function public.month_totals(p_group uuid, p_month date)
returns table (profile_id uuid, display_name text, color public.girl_color, total int)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.color, count(s.id)::int
  from public.profiles p
  left join public.stamps s
    on s.profile_id = p.id
   and s.month = p_month
   and s.voided_at is null
  where p.group_id = p_group
  group by p.id, p.display_name, p.color;
$$;

-- Chiude un mese passato: assegna la penitenza grossa a chi ha il totale più alto
-- (a pari merito a tutte le prime, con la stessa penitenza) e scrive month_closures.
-- Idempotente: se il mese è già chiuso restituisce la chiusura esistente.
-- Con zero timbri non assegna niente, ma registra comunque la chiusura.
create function public.close_month(p_group uuid, p_month date)
returns public.month_closures
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_closure public.month_closures;
  v_max int;
  v_penance uuid;
  v_snapshot jsonb;
begin
  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'p_month deve essere il primo giorno del mese' using errcode = 'invalid_parameter_value';
  end if;

  select g.timezone into v_tz from public.groups g where g.id = p_group;
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
    select p.id into v_penance
    from public.penances p
    where p.group_id = p_group and p.kind = 'monthly' and p.active
    order by random()
    limit 1;

    insert into public.penance_assignments (group_id, profile_id, kind, month, threshold, penance_id)
    select p_group, t.profile_id, 'monthly', p_month, null, v_penance
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

-- Chiude tutti i mesi passati non ancora chiusi, per tutti i gruppi.
-- Parte dal mese di creazione del gruppo (o dal primo timbro, se precedente).
create function public.close_pending_months()
returns table (closed_group uuid, closed_month date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  v_first date;
  v_current date;
  m date;
begin
  for g in select gr.id, gr.timezone, gr.created_at from public.groups gr loop
    v_current := public.month_start(now(), g.timezone);
    select least(
      public.month_start(g.created_at, g.timezone),
      coalesce(min(s.month), v_current)
    )
    into v_first
    from public.stamps s
    where s.group_id = g.id;

    m := v_first;
    while m < v_current loop
      if not exists (
        select 1 from public.month_closures c where c.group_id = g.id and c.month = m
      ) then
        perform public.close_month(g.id, m);
        closed_group := g.id;
        closed_month := m;
        return next;
      end if;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;
end;
$$;
