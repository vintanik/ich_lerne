-- "Ich lerne" — Konto-weite Lern-Einstellungen (geräteübergreifend synchron,
-- im Gegensatz zu reinen UI-Präferenzen wie "Hintergrund", die bewusst nur
-- lokal in localStorage liegen). Im Supabase-Dashboard unter SQL Editor
-- ausführen (Projekt "Ich lerne", NICHT "Ich koche").
--
-- Genau eine Zeile pro Konto (user_id ist Primary Key). Aktuell ein einziges
-- Feld: ob eine falsch beantwortete Karte eine Box zurückfällt (Standard,
-- klassisches Leitner-System) oder in ihrer Box stehen bleibt.

create table if not exists einstellungen (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  karte_faellt_zurueck boolean not null default true
);

alter table einstellungen enable row level security;

create policy "einstellungen: eigene Zeile" on einstellungen
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on einstellungen to authenticated;
