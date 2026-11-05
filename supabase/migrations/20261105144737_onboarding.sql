-- Swear Jar · onboarding (1/2): colori e vincoli sui profili
-- I nuovi valori di enum vanno committati prima di poterli usare: le RPC sono nella migrazione successiva.

-- 8 inchiostri, con i nomi del design (Onboarding2).
alter type public.girl_color rename value 'magenta' to 'fucsia';
alter type public.girl_color add value 'petrolio';
alter type public.girl_color add value 'ocra';
alter type public.girl_color add value 'ardesia';

-- Un colore appartiene a una sola ragazza del gruppo.
alter table public.profiles
  add constraint profiles_color_per_group unique (group_id, color);

-- avatar_url: null = iniziale; "icon:<icona>" = timbro su fondo colore; altrimenti URL https della foto.
alter table public.profiles
  add constraint profiles_avatar_format check (
    avatar_url is null
    or avatar_url ~ '^icon:(peperoncino|aeroplano|nuvola|bomba|fulmine|asterisco)$'
    or avatar_url ~ '^https?://'
  );
