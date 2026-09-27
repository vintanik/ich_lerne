# Ich lerne

Karteikarten lernen nach dem **Leitner-System** — responsive Web-App (PWA-fähig),
für Handy und PC. Vorläufiger Projektname.

## Konzept

Eigene Karten-Sets anlegen (Vokabeln, Fachbegriffe …). Ein Set ist ein **Pool**:
neue Karten landen erst im **Vorrat** (nicht im Trainer, nie fällig). Pro Lerneinheit
holt man selbst eine Portion (z. B. 10 Wörter, oder gezielt ausgewählte) in Box 1 und
lernt sie nach dem Leitner-Boxen-Prinzip ein.

- **Box 1** täglich fällig → **Box 2** alle 2 Tage → **Box 3** alle 4 Tage →
  **Box 4** wöchentlich → **Box 5** alle 2 Wochen
- Richtig → eine Box weiter (max. 5). Falsch → eine Box zurück (mind. 1) —
  Standard, in den Einstellungen pro Konto abschaltbar (dann bleibt die Karte
  bei Falsch einfach in ihrer Box).

Die Box-Intervalle stehen zentral in [`src/leitner.ts`](src/leitner.ts)
(`BOX_INTERVALL_TAGE`) und lassen sich dort anpassen.

## Bibliothek

Einziger Einstiegspunkt: alle Sets verwalten, in beliebig verschachtelten
**Ordnern** (z. B. Sprache → Unit), oder einfach lose auf oberster Ebene — Ordner
sind rein optional, nichts muss einsortiert werden. Ein Set kann jederzeit über
das „Ordner"-Feld auf seiner Übe-Seite in einen anderen Ordner verschoben werden.
Löscht man einen Ordner, gehen seine Inhalte nicht verloren — Unter-Ordner/Sets
rutschen einfach eine Ebene hoch.

Ein Set öffnen führt direkt auf die Übe-Startseite — Box-Übersicht, „Üben"
(fällige Karten), „Einzelne Box üben" (unabhängig von der Fälligkeit, für
gezieltes Wiederholen), „Neue Wörter ins Lernen holen", „Karten verwalten". Der
Trainer selbst (Fortschrittsleiste über die 5 Boxen, Karte umdrehen + selbst
„richtig/falsch", „überspringen") wird von dort aus gestartet — kein separater
"aktiv"-Schritt nötig.

## Technik

- React + TypeScript + Vite
- **Konto-Login (E-Mail + Passwort) mit Cloud-Sync über Supabase** — dieselben Sets
  und derselbe Lernfortschritt sind auf allen Geräten sichtbar (analog „Ich koche",
  eigenes Supabase-Projekt, Region Europe). Kein Magic Link — gleiche Begründung
  wie bei „Ich koche" (Mail-Apps öffnen den Link automatisch, iOS öffnet Safari
  statt der Home-Bildschirm-App).
- Sämtliche Lese-/Schreibzugriffe laufen über die Storage-Schicht
  [`src/storage.ts`](src/storage.ts) (async) — der Rest der App merkt vom
  Backend-Wechsel (ursprünglich IndexedDB) praktisch nichts.
- **Einmalige Altdaten-Übernahme**: War die App schon lokal in Benutzung, bietet
  [`src/cloudMigration.ts`](src/cloudMigration.ts) nach dem ersten Login einmalig an,
  die alten IndexedDB-Daten ins Konto zu übernehmen (analog „Ich koche").
- Backup: Export/Import als JSON-Datei (Einstellungen) — zusätzliche Sicherung,
  kein Ersatz fürs Konto.
- **Bekannte Grenze**: braucht durchgehend Internetverbindung, kein Offline-Modus
  (bewusster Kompromiss, wie bei „Ich koche").

## Supabase einrichten (einmalig)

1. Neues Projekt auf [supabase.com](https://supabase.com/dashboard) anlegen
   (Region Europe empfohlen).
2. Im SQL Editor der Reihe nach
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   [`supabase/migrations/0002_ordner.sql`](supabase/migrations/0002_ordner.sql) und
   [`supabase/migrations/0003_einstellungen.sql`](supabase/migrations/0003_einstellungen.sql)
   ausführen — legt die Tabellen `sets`/`karten`/`ordner`/`einstellungen` samt
   Row-Level-Security an.
3. Unter Project Settings → API: „Project URL" und „anon public key" kopieren.
4. `.env.example` zu `.env` kopieren und mit diesen beiden Werten befüllen.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Typecheck + Production-Build
npm run lint
```

## Datenmodell

Siehe [`src/types.ts`](src/types.ts): `Ordner` (selbstverschachtelt über `parentId`,
`null` = oberste Ebene) → `KartenSet` (mit `ordnerId?`, `null`/fehlt = oberste Ebene)
→ `Karte` (mit `gestartet?`, `sortIndex?`, `box`, `naechsteWiederholung`, optionalem
Base64-`bildBase64`). Karten ohne `gestartet`/`sortIndex` (Altdaten) gelten als
gestartet — siehe `istGestartet` / `sortiereKarten`. Baum-Helfer (Pfad, Kinder,
eingerückte flache Liste) in [`src/ordner.ts`](src/ordner.ts).
