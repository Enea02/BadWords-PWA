-- Swear Jar · vista del tabellone
-- Timbri validi per (gruppo, mese, ragazza, parolaccia). Il client legge da qui.
-- security_invoker: la vista applica la RLS di chi la interroga.

create view public.monthly_board
with (security_invoker = true)
as
select
  s.group_id,
  s.month,
  s.profile_id,
  s.word_id,
  count(*)::int as stamps
from public.stamps s
where s.voided_at is null
group by s.group_id, s.month, s.profile_id, s.word_id;
