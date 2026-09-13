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
  Box-Übersicht, „Üben“, „Neue Wörter ins Lernen holen“, „Karten verwalten“.
- **Daran arbeite ich** — Trainer. Zeigt nur Sets, die in der Bibliothek als „aktiv“
  markiert sind; übt deren gestartete Karten (Fortschrittsleiste über die 5 Boxen,
  Karte umdrehen + selbst „richtig/falsch“, „überspringen“).

## Technik

- React + TypeScript + Vite
- **Keine Anmeldung, keine Cloud.** Daten liegen lokal im Browser (IndexedDB).
- Sämtliche Lese-/Schreibzugriffe laufen über die Storage-Schicht
  [`src/storage.ts`](src/storage.ts) (async), damit eine spätere Cloud-Migration
  (Supabase, analog „Ich koche“) ohne Datenmodell-Bruch möglich ist.
- Backup: Export/Import als JSON-Datei (Einstellungen) — der einzige Weg für
  einen Gerätewechsel, solange es keine Cloud gibt.

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
gestartet — siehe `istGestartet` / `sortiereKarten`. IndexedDB v2 hat den früheren
`gruppen`-Store entfernt.
# ich_lerne
