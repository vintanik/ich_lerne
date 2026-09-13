# Projekt: [Name der App, z.B. "Leitner" oder eigener Name]

## Konzept
Eine App zum Lernen von Karteikarten nach dem klassischen Leitner-System — für Handy und PC (responsive Web-App, PWA-fähig). Nutzer legen eigene Karten-Sets an (z.B. Vokabeln, Fachbegriffe), teilen grosse Sets in kleinere Lerngruppen auf und wiederholen Karten nach dem Leitner-Boxen-Prinzip.

## Design-System
Gleiches visuelles Grundgerüst wie bei "Ich koche", neue Farbwelt:
- Signaturfarbe: Bordeaux/Beere `#7A2E3A` (Platzhalter — beim Bauen final abstimmen)
- Akzentfarbe: Salbeigrün `#8A9A7E` (Platzhalter — beim Bauen final abstimmen)
- Fließtext-Farbe: `#3D3D3A` (kein reines Schwarz)
- Hintergrund (modern/clean-Variante): `#F6F1EA`
- Hintergrund (vintage-Variante): `#F1E3CC` (gealtertes Papier)
- Typografie: Fraunces (Titel, warm/editorial) + Karla (Fließtext)
- Stilmittel wie bei "Ich koche": doppelter Rahmen (`border: 3px double`), umrandete statt gefüllte Tags/Chips, kursive Kleintexte für Notizen, dezente Ornament-Trennlinien mit kleinem Punkt in Bordeaux/Salbei
- Ruhiges, editoriales UI, grosse Touch-Ziele für Handy-Nutzung, gut lesbare Typografie

## Technische Architektur (Startpunkt)
- **Datenhaltung**: erstmal vollständig lokal (localStorage oder IndexedDB, falls grössere Datenmengen wie Bilder pro Karte absehbar sind — IndexedDB ist dafür robuster)
- **Kein Login/Account** in der ersten Version — Daten bleiben auf dem Gerät
- Struktur so bauen, dass eine spätere Cloud-Migration (Supabase, analog "Ich koche") ohne Datenmodell-Bruch möglich ist: alle Lese-/Schreibzugriffe sauber in einer eigenen Storage-Schicht kapseln, nicht direkt verteilt im Code mit `localStorage.getItem(...)` arbeiten
- Backup-Funktion (Export/Import als JSON-Datei) von Anfang an sinnvoll, da ohne Cloud sonst kein Geräte-Wechsel möglich ist

## Datenmodell
- **Set**: `{ id, name, erstelltAm, gruppengroesse (default 15) }`
- **Gruppe** (automatisch oder manuell gebildete Lern-Untergruppe innerhalb eines Sets): `{ id, setId, name (z.B. "Wörter 1–15"), kartenIds[] }`
- **Karte**: `{ id, setId, gruppeId, vorderseite, rueckseite, bild? (optional, Base64), box (1–5, Start: 1), naechsteWiederholung (Datum), erstelltAm }`

## Kernfunktionen

### 1. Sets verwalten
- Set erstellen, umbenennen, löschen
- Karten manuell hinzufügen ODER per Text-Paste importieren (z.B. Zeile für Zeile "Begriff — Übersetzung", automatisch in Vorder-/Rückseite aufgeteilt)
- Beim Anlegen/Import: automatische Aufteilung in Gruppen nach der eingestellten Gruppengrösse (Default 15, änderbar) — z.B. 300 Wörter → 20 Gruppen à 15 Karten, letzte Gruppe darf kleiner sein
- Gruppen im Nachhinein manuell verschiebbar/anpassbar (Karten zwischen Gruppen umsortieren)

### 2. Karten verwalten
- Einzelne Karte bearbeiten/löschen, optional Bild hinzufügen
- Übersicht pro Gruppe: wie viele Karten, wie viele in welcher Box

### 3. Lernmodus (Kern-Feature)
- Auswahl: ganzes Set, eine einzelne Gruppe, oder "alle heute fälligen Karten setübergreifend"
- Karten werden nacheinander gezeigt: Vorderseite → Tippen/Klicken zum Umdrehen → Selbsteinschätzung "richtig" / "falsch"
- Leitner-Logik:
  - **Richtig** → Karte wandert eine Box weiter (max. Box 5)
  - **Falsch** → Karte fällt zurück auf Box 1
- Box-Intervalle (Startwerte, im Code klar benannt und leicht änderbar):
  - Box 1: täglich fällig
  - Box 2: alle 2 Tage
  - Box 3: alle 4 Tage
  - Box 4: wöchentlich
  - Box 5: alle 2 Wochen (= "gemeistert", aber nicht komplett aus der Rotation genommen)
- Am Ende einer Lernrunde: kurze Zusammenfassung (wie viele richtig/falsch, wie viele Karten sind jetzt in welcher Box)

### 4. Fortschritt & Übersicht
- Pro Set: Fortschrittsbalken/Anzeige, wie viele Karten in welcher Box stehen (z.B. kleine Balkengrafik über die 5 Boxen)
- Pro Gruppe: gleiche Mini-Übersicht
- Startbildschirm: "Heute fällig" — Anzahl Karten, die über alle Sets/Gruppen hinweg gerade an der Reihe sind

### 5. Backup
- Export aller Sets/Karten/Fortschritt als JSON-Datei
- Import einer solchen Datei (z.B. bei Gerätewechsel)

## Bewusst NICHT Teil der ersten Version
- Kein Login/Cloud-Sync (kommt später, siehe Architektur-Hinweis oben)
- Keine KI-generierten Karteninhalte — Nutzer erstellt Karten selbst
- Kein Teilen/Zusammenarbeiten an Sets mit anderen Nutzer:innen

## Spätere Vision (nicht jetzt bauen, aber Architektur sollte es nicht verbauen)
- Cloud-Sync/Login analog "Ich koche" (Supabase), damit Sets geräteübergreifend verfügbar sind
- Sets teilen (z.B. Lehrperson erstellt Set, Klasse lernt damit)
- Audio pro Karte (z.B. Aussprache bei Vokabeln)
