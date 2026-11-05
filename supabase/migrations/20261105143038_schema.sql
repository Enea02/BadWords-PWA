-- Swear Jar · schema
-- Tabelle, tipi e vincoli. La logica (trigger, RPC) e la sicurezza (RLS) sono nelle migrazioni successive.

-- ───────────────────────────── Tipi ─────────────────────────────

create type public.word_icon as enum ('peperoncino', 'aeroplano', 'nuvola', 'bomba', 'fulmine', 'asterisco');
create type public.girl_color as enum ('magenta', 'blu', 'verde', 'viola', 'arancio');
create type public.profile_role as enum ('admin', 'member');
create type public.penance_kind as enum ('small', 'monthly');
create type public.assignment_status as enum ('pending', 'done');

-- ───────────────────────── Utilità ─────────────────────────

-- Primo giorno del mese di p_ts nel fuso p_tz (es. Europe/Rome).
create function public.month_start(p_ts timestamptz, p_tz text)
returns date
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', p_ts at time zone p_tz))::date;
$$;

-- Codice invito di 6 caratteri, senza lettere ambigue (0/O, 1/I).
create function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups g where g.invite_code = code);
  end loop;
  return code;
end;
$$;

-- ───────────────────────────── Tabelle ─────────────────────────────

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now()
);

-- La default chiama una funzione che legge groups: va impostata dopo la create table.
alter table public.groups alter column invite_code set default public.generate_invite_code();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 24),
  avatar_url text,
  color public.girl_color not null,
  role public.profile_role not null default 'member',
  created_at timestamptz not null default now(),
  -- target delle FK composite: garantiscono che i riferimenti restino nello stesso gruppo
  unique (id, group_id)
);
create index profiles_group_idx on public.profiles (group_id);

create table public.words (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 24),
  icon public.word_icon not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, group_id)
);
create index words_group_idx on public.words (group_id, sort_order);

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null,
  word_id uuid not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  month date not null, -- valorizzata dal trigger before insert
  voided_at timestamptz,
  voided_by uuid,
  foreign key (profile_id, group_id) references public.profiles (id, group_id) on delete cascade,
  foreign key (word_id, group_id) references public.words (id, group_id) on delete restrict,
  -- se l'autrice lascia il gruppo il timbro resta, senza autrice
  foreign key (created_by, group_id) references public.profiles (id, group_id) on delete set null (created_by),
  foreign key (voided_by, group_id) references public.profiles (id, group_id) on delete set null (voided_by),
  check (extract(day from month) = 1),
  check (voided_by is null or voided_at is not null)
);
create index stamps_board_idx on public.stamps (group_id, month) where voided_at is null;
create index stamps_profile_month_idx on public.stamps (profile_id, month) where voided_at is null;

create table public.penances (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  kind public.penance_kind not null,
  text text not null check (char_length(btrim(text)) between 1 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, group_id)
);
create index penances_group_idx on public.penances (group_id, kind) where active;

create table public.penance_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null,
  kind public.penance_kind not null,
  month date not null,
  threshold int, -- 10, 20, 30… per le small; null per la monthly
  penance_id uuid, -- null se il mazzo era vuoto al momento dell'estrazione
  status public.assignment_status not null default 'pending',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (profile_id, group_id) references public.profiles (id, group_id) on delete cascade,
  foreign key (penance_id, group_id) references public.penances (id, group_id),
  check (extract(day from month) = 1),
  check ((kind = 'small') = (threshold is not null)),
  check (threshold is null or (threshold > 0 and threshold % 10 = 0)),
  check ((status = 'done') = (done_at is not null)),
  -- idempotenza: una sola penitenza per soglia (e una sola monthly) per ragazza e mese
  constraint penance_assignments_once unique nulls not distinct (profile_id, month, kind, threshold)
);
create index penance_assignments_group_idx on public.penance_assignments (group_id, status, month);

create table public.month_closures (
  group_id uuid not null references public.groups (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  closed_at timestamptz not null default now(),
  -- [{profile_id, display_name, color, total, rank}] ordinato per totale
  snapshot jsonb not null,
  primary key (group_id, month)
);
