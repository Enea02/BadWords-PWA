-- Swear Jar · pannello admin
-- 1. Soglia della penitenza piccola configurabile per gruppo (5…30, a passi di 5; default 10).
-- 2. Rigenerazione del codice invito (solo admin).

alter table public.groups
  add column penance_every int not null default 10
  check (penance_every between 5 and 30 and penance_every % 5 = 0);

grant update (penance_every) on public.groups to authenticated; -- la policy limita già all'admin

-- Le soglie ora sono multipli della soglia del gruppo, non più solo di 10.
alter table public.penance_assignments drop constraint penance_assignments_threshold_check;
alter table public.penance_assignments
  add constraint penance_assignments_threshold_check check (threshold is null or threshold > 0);

create or replace function public.stamps_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_threshold int;
  v_every int;
  v_custom boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text || ':' || new.month::text, 0));

  select count(*) into v_total
  from public.stamps s
  where s.profile_id = new.profile_id
    and s.month = new.month
    and s.voided_at is null;

  select g.penance_mode = 'custom', g.penance_every into v_custom, v_every
  from public.groups g where g.id = new.group_id;

  -- Tutte le soglie raggiunte (multipli di penance_every); il vincolo unico rende idempotente il ciclo.
  v_threshold := v_every;
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
    v_threshold := v_threshold + v_every;
  end loop;

  return null;
end;
$$;

-- Nuovo codice invito per il proprio gruppo; il vecchio smette di funzionare.
create function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'Solo l''admin rigenera il codice' using errcode = 'insufficient_privilege';
  end if;
  update public.groups set invite_code = public.generate_invite_code()
  where id = public.my_group_id()
  returning invite_code into v_code;
  return v_code;
end;
$$;

revoke all on function public.regenerate_invite_code() from public, anon;
grant execute on function public.regenerate_invite_code() to authenticated;
