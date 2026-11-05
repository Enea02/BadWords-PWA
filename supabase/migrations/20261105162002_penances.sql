-- Swear Jar · penitenze
-- acknowledged_at: quando la diretta interessata ha visto la schermata "Penitenza sbloccata"
-- ("Accetto il mio destino"). Serve a mostrarla una volta sola, anche se era offline.

alter table public.penance_assignments add column acknowledged_at timestamptz;

grant update (acknowledged_at) on public.penance_assignments to authenticated;

-- Ridefinisce il trigger: done_at e acknowledged_at li mette il server;
-- la conferma di lettura la può dare solo l'interessata.
create or replace function public.penance_assignments_before_update()
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
