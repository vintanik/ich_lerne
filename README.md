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
- Richtig → eine Box weiter (max. 5). Falsch → zurück auf Box 1.

Die Box-Intervalle stehen zentral in [`src/leitner.ts`](src/leitner.ts)
(`BOX_INTERVALL_TAGE`) und lassen sich dort anpassen.

## Zwei Bereiche

- **Bibliothek** — alle Sets verwalten. Ein Set öffnen führt auf die Übe-Startseite:
  Box-Übersicht, „Üben", „Neue Wörter ins Lernen holen", „Karten verwalten".
- **Daran arbeite ich** — Trainer. Zeigt nur Sets, die in der Bibliothek als „aktiv"
  markiert sind; übt deren gestartete Karten (Fortschrittsleiste über die 5 Boxen,
  Karte umdrehen + selbst „richtig/falsch", „überspringen").

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
2. Im SQL Editor [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   ausführen — legt die Tabellen `sets`/`karten` samt Row-Level-Security an.
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

Siehe [`src/types.ts`](src/types.ts): `KartenSet` (mit `aktiv?`) → `Karte`
(mit `gestartet?`, `sortIndex?`, `box`, `naechsteWiederholung`, optionalem
Base64-`bildBase64`). Karten ohne `gestartet`/`sortIndex` (Altdaten) gelten als
gestartet — siehe `istGestartet` / `sortiereKarten`.
