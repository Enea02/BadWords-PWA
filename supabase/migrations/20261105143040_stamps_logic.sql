-- Swear Jar · logica dei timbri e delle penitenze piccole

-- ─────────────── stamps: before insert ───────────────
-- Normalizza il timbro e calcola il mese nel fuso del gruppo.
create function public.stamps_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
begin
  -- I client (auth.uid() presente) non scelgono data né annullamento.
  -- service_role e postgres (seed, test) possono impostare created_at.
  if auth.uid() is not null then
    new.created_at := now();
    new.voided_at := null;
    new.voided_by := null;
  end if;

  select g.timezone into v_tz from public.groups g where g.id = new.group_id;
  if v_tz is null then
    raise exception 'Gruppo inesistente' using errcode = 'foreign_key_violation';
  end if;

  if not exists (
    select 1 from public.words w
    where w.id = new.word_id and w.group_id = new.group_id and w.active
  ) then
    raise exception 'Parolaccia non attiva o di un altro gruppo' using errcode = 'check_violation';
  end if;

  new.month := public.month_start(new.created_at, v_tz);
  return new;
end;
$$;

create trigger stamps_before_insert
before insert on public.stamps
for each row execute function public.stamps_before_insert();

-- ─────────────── stamps: after insert ───────────────
-- A 10, 20, 30… timbri validi nel mese assegna una penitenza piccola estratta a caso.
-- Le soglie già assegnate restano (anche se poi si annulla e si scende sotto).
create function public.stamps_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_threshold int;
begin
  -- Serializza i timbri della stessa ragazza nello stesso mese, così due
  -- inserimenti simultanei non "saltano" una soglia.
  perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text || ':' || new.month::text, 0));

  select count(*) into v_total
  from public.stamps s
  where s.profile_id = new.profile_id
    and s.month = new.month
    and s.voided_at is null;

  -- Tutte le soglie raggiunte, non solo l'ultima: copre anche gli insert multipli
  -- in un solo statement. Il vincolo unico rende idempotente il ciclo.
  v_threshold := 10;
  while v_threshold <= v_total loop
    insert into public.penance_assignments (group_id, profile_id, kind, month, threshold, penance_id)
    values (
      new.group_id,
      new.profile_id,
      'small',
      new.month,
      v_threshold,
      (
        select p.id from public.penances p
        where p.group_id = new.group_id and p.kind = 'small' and p.active
        order by random()
        limit 1
      )
    )
    on conflict on constraint penance_assignments_once do nothing;
    v_threshold := v_threshold + 10;
  end loop;

  return null;
end;
$$;

create trigger stamps_after_insert
after insert on public.stamps
for each row execute function public.stamps_after_insert();

-- ─────────────── stamps: before update ───────────────
-- L'unico update concesso ai client è l'annullamento: data e autrice le mette il server.
create function public.stamps_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.voided_at is null then
      raise exception 'Un timbro annullato non si ripristina' using errcode = 'check_violation';
    end if;
    new.voided_at := now();
    new.voided_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger stamps_before_update
before update on public.stamps
for each row execute function public.stamps_before_update();

-- ─────────────── penance_assignments: before update ───────────────
create function public.penance_assignments_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    new.done_at := now();
  elsif new.status = 'pending' then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger penance_assignments_before_update
before update on public.penance_assignments
for each row execute function public.penance_assignments_before_update();

-- ─────────────── profiles: guardia sui ruoli ───────────────
-- Solo l'admin cambia i ruoli; il gruppo resta sempre con almeno un'admin.
create function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.group_id = old.group_id and p.role = 'admin'
    ) then
      raise exception 'Solo l''admin può cambiare i ruoli' using errcode = 'insufficient_privilege';
    end if;

    if old.role = 'admin' and not exists (
      select 1 from public.profiles p
      where p.group_id = old.group_id and p.role = 'admin' and p.id <> old.id
    ) then
      raise exception 'Il gruppo deve avere almeno un''admin' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.profiles_guard_role();
