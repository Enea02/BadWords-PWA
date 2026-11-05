-- Swear Jar · fine mese
-- Ultimo mese chiuso di cui la ragazza ha visto la schermata "Bocca sporca del mese".
alter table public.profiles add column last_seen_closure date check (last_seen_closure is null or extract(day from last_seen_closure) = 1);

grant update (last_seen_closure) on public.profiles to authenticated;

-- Solo per sé: nemmeno l'admin la cambia per le altre.
create function public.profiles_guard_seen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.last_seen_closure is distinct from old.last_seen_closure
     and auth.uid() is not null and auth.uid() <> old.id then
    raise exception 'last_seen_closure si aggiorna solo per sé' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_seen
before update on public.profiles
for each row execute function public.profiles_guard_seen();
