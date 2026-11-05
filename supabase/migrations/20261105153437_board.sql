-- Swear Jar · tabellone
-- Il client genera l'id del timbro: così l'evento Realtime del proprio timbro si riconosce
-- e l'aggiornamento ottimistico non viene contato due volte.
grant insert (id) on public.stamps to authenticated;

-- Default solo formale (il trigger before insert la ricalcola nel fuso del gruppo):
-- così il client non deve mandare `month`, colonna che non può scrivere.
alter table public.stamps alter column month set default (date_trunc('month', now()))::date;
