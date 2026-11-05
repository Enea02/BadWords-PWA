-- Swear Jar · onboarding (2/2): RPC di registrazione e bucket avatar
-- Tutte chiamate solo dal server (service_role): la registrazione pubblica è disattivata
-- e gli account si creano dopo aver verificato il codice invito.

-- ─────────────── Mazzo e legenda di partenza per un gruppo nuovo ───────────────
create function public.seed_group_defaults(p_group uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.words (group_id, label, icon, sort_order) values
    (p_group, 'C***o', 'peperoncino', 1),
    (p_group, 'Vaff***', 'aeroplano', 2),
    (p_group, 'M***a', 'nuvola', 3),
    (p_group, 'S****o', 'bomba', 4),
    (p_group, 'Bestemmia', 'fulmine', 5),
    (p_group, 'Altro', 'asterisco', 6);

  insert into public.penances (group_id, kind, text) values
    (p_group, 'small', 'Offri il caffè a tutte al prossimo incontro.'),
    (p_group, 'small', 'Manda nel gruppo un vocale di scuse il più teatrale possibile.'),
    (p_group, 'small', 'Per 24 ore ogni tuo messaggio finisce con "con affetto".'),
    (p_group, 'small', 'Canta il ritornello di una canzone scelta dalle altre.'),
    (p_group, 'small', 'Fai un complimento sincero a ognuna del gruppo.'),
    (p_group, 'small', 'Paghi tu il prossimo giro di patatine.'),
    (p_group, 'small', 'Per un giorno niente emoji: solo parole gentili.'),
    (p_group, 'small', 'Racconta una figuraccia che nessuna conosce.'),
    (p_group, 'small', 'Scegli il prossimo film, ma dev''essere romantico.'),
    (p_group, 'small', 'Per un giorno tieni la foto profilo scelta dal gruppo.'),
    (p_group, 'monthly', 'Organizzi e offri l''aperitivo a tutte.'),
    (p_group, 'monthly', 'Cucini una cena per il gruppo, dall''antipasto al dolce.'),
    (p_group, 'monthly', 'Per un''intera serata parli come una nobildonna dell''Ottocento.');
$$;

-- ─────────────── Anteprima del codice invito ───────────────
-- null se il codice non esiste. Mostra solo ciò che serve alla card "Stai entrando in…".
create function public.preview_invite(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'group_id', g.id,
    'name', g.name,
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'display_name', p.display_name,
          'color', p.color,
          'avatar_url', p.avatar_url,
          'role', p.role
        )
        order by p.created_at
      )
      from public.profiles p
      where p.group_id = g.id
    ), '[]'::jsonb)
  )
  from public.groups g
  where g.invite_code = upper(btrim(p_code));
$$;

-- ─────────────── Nome utente libero? ───────────────
create function public.auth_email_taken(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(btrim(p_email)));
$$;

-- ─────────────── Ingresso in un gruppo esistente ───────────────
-- Errori: SJ404 codice inesistente, SJ409 già in un gruppo, 23505 profiles_color_per_group colore preso.
create function public.join_group(
  p_user uuid,
  p_code text,
  p_display_name text,
  p_color public.girl_color,
  p_avatar text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
  v_profile public.profiles;
begin
  select g.id into v_group from public.groups g where g.invite_code = upper(btrim(p_code));
  if v_group is null then
    raise exception 'Codice invito non valido' using errcode = 'SJ404';
  end if;

  if exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Questo account è già in un gruppo' using errcode = 'SJ409';
  end if;

  insert into public.profiles (id, group_id, display_name, color, avatar_url, role)
  values (p_user, v_group, btrim(p_display_name), p_color, p_avatar, 'member')
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ─────────────── Creazione di un gruppo nuovo ───────────────
-- Chi lo crea è l'admin. Il gruppo nasce con legenda e mazzo di default.
create function public.create_group(
  p_user uuid,
  p_group_name text,
  p_display_name text,
  p_color public.girl_color,
  p_avatar text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid;
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Questo account è già in un gruppo' using errcode = 'SJ409';
  end if;

  insert into public.groups (name) values (btrim(p_group_name)) returning id into v_group;
  perform public.seed_group_defaults(v_group);

  insert into public.profiles (id, group_id, display_name, color, avatar_url, role)
  values (p_user, v_group, btrim(p_display_name), p_color, p_avatar, 'admin')
  returning * into v_profile;

  return v_profile;
end;
$$;

-- ─────────────── Permessi ───────────────
revoke all on function public.seed_group_defaults(uuid) from public, anon, authenticated;
revoke all on function public.preview_invite(text) from public, anon, authenticated;
revoke all on function public.auth_email_taken(text) from public, anon, authenticated;
revoke all on function public.join_group(uuid, text, text, public.girl_color, text) from public, anon, authenticated;
revoke all on function public.create_group(uuid, text, text, public.girl_color, text) from public, anon, authenticated;

grant execute on function public.preview_invite(text) to service_role;
grant execute on function public.auth_email_taken(text) to service_role;
grant execute on function public.join_group(uuid, text, text, public.girl_color, text) to service_role;
grant execute on function public.create_group(uuid, text, text, public.girl_color, text) to service_role;

-- ─────────────── Bucket avatar ───────────────
-- Lettura pubblica (gli URL finiscono negli <img>); scrittura solo dal server con service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
