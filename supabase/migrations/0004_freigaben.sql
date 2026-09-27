-- "Ich lerne" — Sets/Ordner per Link teilen (öffentlich, ohne Login).
-- Im Supabase-Dashboard unter SQL Editor ausführen (Projekt "Ich lerne",
-- NICHT "Ich koche"). Gleiches Muster wie "Ich koche"s Rezept-Freigaben.
--
-- Entwurfsentscheidungen (identisch zu "Ich koche"):
-- - Jede Freigabe ist eine EIGENSTÄNDIGE, zum Zeitpunkt des Teilens
--   eingefrorene Kopie (Karten als jsonb) — kein Live-Verweis auf das
--   Original. Bearbeitung/Löschung des Originals wirkt sich nie auf bereits
--   bestehende Freigabe-Links aus. Mehrfaches Teilen erzeugt bewusst mehrere
--   unabhängige Zeilen (kein Unique-Constraint).
-- - Token = Primary Key (uuid), direkt als URL-Baustein. Kein separates
--   "slug"-Feld.
-- - `sets`/`karten`/`ordner` bleiben für `anon` komplett ungrantet — der
--   einzige anonyme Lesezugriff läuft über zwei enge, parametrisierte
--   security-definer-Funktionen weiter unten.
-- - Kein Update/Delete-Grant vorerst — Freigaben sind unveränderliche
--   Kopien; "Freigabe aufheben" kommt erst mit einer späteren Ausbaustufe.

create table kartenset_freigaben (
  id uuid primary key default gen_random_uuid(), -- zugleich der Token im Link
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Nur Bookkeeping, nie für Live-Lookups verwendet: bleibt bei Löschung des
  -- Originals bewusst bestehen (set null, nicht cascade).
  ursprungs_set_id uuid references sets (id) on delete set null,
  name text not null,
  -- Array von { vorderseite, rueckseite } — bewusst ohne Box/Fälligkeit/
  -- gestartet (Empfänger startet immer frisch im Vorrat) und ohne Bild (die
  -- bestehende Sammel-Anlage eines Sets kann ohnehin keine Bilder setzen).
  karten jsonb not null default '[]'::jsonb,
  erstellt_am timestamptz not null default now()
);

create index kartenset_freigaben_user_id_idx on kartenset_freigaben (user_id);

alter table kartenset_freigaben enable row level security;

create policy "kartenset_freigaben: eigene Zeilen" on kartenset_freigaben
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert on kartenset_freigaben to authenticated;

create table ordner_freigaben (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ursprungs_ordner_id uuid references ordner (id) on delete set null,
  name text not null,
  -- Ganzer Ordnerbaum als ein Blob: { name, sets: [{ name, karten: [...] }],
  -- unterordner: [ { name, sets: [...], unterordner: [...] }, ... ] } —
  -- beliebig tief, ein Feld statt mehrerer Tabellen für einen Snapshot.
  inhalt jsonb not null default '{}'::jsonb,
  erstellt_am timestamptz not null default now()
);

create index ordner_freigaben_user_id_idx on ordner_freigaben (user_id);

alter table ordner_freigaben enable row level security;

create policy "ordner_freigaben: eigene Zeilen" on ordner_freigaben
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert on ordner_freigaben to authenticated;

-- Anonymer Lesezugriff ausschliesslich über diese zwei Funktionen mit genau
-- einem Parameter (dem unerratbaren Token) — nie über die Tabellen direkt.
create or replace function get_geteiltes_set(p_token uuid)
returns table (name text, karten jsonb)
language sql
security definer
set search_path = public
as $$
  select name, karten from kartenset_freigaben where id = p_token;
$$;

create or replace function get_geteilten_ordner(p_token uuid)
returns table (name text, inhalt jsonb)
language sql
security definer
set search_path = public
as $$
  select name, inhalt from ordner_freigaben where id = p_token;
$$;

grant execute on function get_geteiltes_set(uuid) to anon, authenticated;
grant execute on function get_geteilten_ordner(uuid) to anon, authenticated;
