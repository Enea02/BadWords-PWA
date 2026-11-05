-- Dice al database locale dove chiamare il webhook delle notifiche (vedi `pnpm dev:push-webhook`).
-- Variabili psql: :'url' e :'secret'. Idempotente.
delete from vault.secrets where name in ('push_flush_url', 'push_flush_secret');
select vault.create_secret(:'url', 'push_flush_url');
select vault.create_secret(:'secret', 'push_flush_secret');
