-- "Ich lerne" — Grundschema für Cloud-Sync (Konten, damit dieselben Sets auf
-- PC und Handy sichtbar sind). Im Supabase-Dashboard unter SQL Editor
-- ausführen (oder via `supabase db push`).
--
-- Entwurfsentscheidungen (analog "Ich koche"):
-- - user_id überall vorhanden, RLS sorgt dafür, dass jede:r nur die eigenen
--   Zeilen sieht/ändert. Sharing ist bewusst nicht Teil dieses Schemas.
-- - karten trägt user_id redundant (zusätzlich zu set_id), damit die
--   RLS-Policy nicht über einen Join auf sets gehen muss.
-- - Löschen eines Sets löscht seine Karten automatisch mit (on delete cascade)
--   — storage.ts muss die Karten dafür nicht separat löschen.
-- - ids werden clientseitig per crypto.randomUUID() vergeben (siehe
--   src/leitner.ts) — die Spalten-Defaults sind nur ein Fallback.

create table if not exists sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  aktiv boolean not null default false,
  erstellt_am timestamptz not null default now()
);

create index if not exists sets_user_id_idx on sets (user_id);

create table if not exists karten (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sets (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sort_index integer not null default 0,
  vorderseite text not null,
  rueckseite text not null,
  bild_base64 text,
  gestartet boolean not null default false,
  box smallint not null default 1,
  naechste_wiederholung date not null default current_date,
  erstellt_am timestamptz not null default now()
);

create index if not exists karten_user_id_idx on karten (user_id);
create index if not exists karten_set_id_idx on karten (set_id);

-- Row Level Security: jede:r sieht/ändert ausschliesslich eigene Zeilen.
alter table sets enable row level security;
alter table karten enable row level security;

create policy "sets: eigene Zeilen" on sets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "karten: eigene Zeilen" on karten
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS schränkt nur ein, WELCHE Zeilen sichtbar sind — die Grundberechtigung,
-- überhaupt select/insert/update/delete auszuführen, ist eine separate Stufe
-- und muss zusätzlich vergeben werden (bei "Ich koche" anfangs vergessen,
-- deshalb hier gleich mit rein).
grant usage on schema public to authenticated;
grant select, insert, update, delete on sets to authenticated;
grant select, insert, update, delete on karten to authenticated;
