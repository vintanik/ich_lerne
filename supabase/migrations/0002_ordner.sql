-- "Ich lerne" — Ordner zum Aufräumen der Bibliothek (z. B. Sprache → Unit).
-- Im Supabase-Dashboard unter SQL Editor ausführen (Projekt "Ich lerne",
-- NICHT "Ich koche").
--
-- Entwurfsentscheidungen:
-- - Ordner können sich selbst verschachteln (parent_id → ordner.id), beliebig
--   tief — Sprache und Unit sind einfach zwei Ebenen davon, keine feste Grenze.
-- - on delete set null überall: löscht man einen Ordner, werden seine
--   direkten Unter-Ordner/Sets NICHT mitgelöscht, sondern rutschen eine
--   Ebene hoch (bzw. auf die Wurzel) — nichts geht verloren.
-- - sets.ordner_id ist nullable: null = oberste Ebene (unverändertes
--   Verhalten für alle bestehenden Sets, die keinem Ordner zugewiesen sind).

create table if not exists ordner (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  parent_id uuid references ordner (id) on delete set null,
  erstellt_am timestamptz not null default now()
);

create index if not exists ordner_user_id_idx on ordner (user_id);
create index if not exists ordner_parent_id_idx on ordner (parent_id);

alter table ordner enable row level security;

create policy "ordner: eigene Zeilen" on ordner
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on ordner to authenticated;

alter table sets add column if not exists ordner_id uuid references ordner (id) on delete set null;
create index if not exists sets_ordner_id_idx on sets (ordner_id);
