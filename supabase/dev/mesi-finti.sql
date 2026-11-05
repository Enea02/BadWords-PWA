-- Solo sviluppo locale: finge che "Le Sboccate" esista da 3 mesi e riempie i due mesi scorsi.
-- Uso: pnpm dev:mesi-finti && pnpm dev:chiudi-mesi
-- Mese -1: Giulia 14, Bea 11, Marta 9, Sofia 6, Chiara 3 (come nella board FineMese).
-- Mese -2: Giulia e Bea a pari merito con 12.  Mese -3: nessun timbro (mese immacolato).
do $$
declare
  g constant uuid := '00000000-0000-4000-8000-00000000a001';
  m0 date := public.month_start(now(), 'Europe/Rome');
  w uuid;
  r record;
begin
  update public.groups set created_at = (m0 - interval '3 months' + interval '2 days') where id = g;
  update public.profiles set created_at = (m0 - interval '3 months' + interval '2 days') where group_id = g;
  select id into w from public.words where group_id = g order by sort_order limit 1;

  for r in
    select * from (values
      ('00000000-0000-4000-8000-0000000000b1'::uuid, 1, 14), ('00000000-0000-4000-8000-0000000000b5'::uuid, 1, 11),
      ('00000000-0000-4000-8000-0000000000b2'::uuid, 1, 9),  ('00000000-0000-4000-8000-0000000000b3'::uuid, 1, 6),
      ('00000000-0000-4000-8000-0000000000b4'::uuid, 1, 3),
      ('00000000-0000-4000-8000-0000000000b1'::uuid, 2, 12), ('00000000-0000-4000-8000-0000000000b5'::uuid, 2, 12),
      ('00000000-0000-4000-8000-0000000000b2'::uuid, 2, 7),  ('00000000-0000-4000-8000-0000000000b3'::uuid, 2, 4)
    ) as t (profile_id, ago, n)
  loop
    insert into public.stamps (group_id, profile_id, word_id, created_by, created_at)
    select g, r.profile_id, w, r.profile_id,
           ((m0 - make_interval(months => r.ago)) + interval '10 days 12 hours')::timestamp at time zone 'Europe/Rome'
    from generate_series(1, r.n);
  end loop;
end $$;
