// Datenmodell "Ich lerne" — bewusst flach und cloud-migrations-freundlich
// gehalten (später Supabase analog "Ich koche"). Alle Lese-/Schreibzugriffe
// laufen ausschliesslich über storage.ts, nie direkt über die Storage-API.

export type BoxNummer = 1 | 2 | 3 | 4 | 5;

export interface KartenSet {
  id: string;
  name: string;
  erstelltAm: string;
  /**
   * In der Bibliothek als "daran arbeite ich" markiert. Der Trainer-Bereich
   * zeigt und übt nur aktive Sets. Fehlt bei Altdaten → wie false.
   */
  aktiv?: boolean;
}

export interface Karte {
  id: string;
  setId: string;
  /** Reihenfolge innerhalb des Sets (für "die nächsten N starten"). */
  sortIndex?: number;
  vorderseite: string;
  rueckseite: string;
  /** optionales Bild, als Base64-Data-URL. */
  bildBase64?: string;
  /**
   * false = im Vorrat (noch nicht im Lernen, nie fällig, nicht im Trainer).
   * true = in der Box-Rotation. Fehlt bei Altdaten → als true behandelt.
   */
  gestartet?: boolean;
  box: BoxNummer;
  /** ISO-Datum (YYYY-MM-DD), an dem die Karte wieder fällig wird. */
  naechsteWiederholung: string;
  erstelltAm: string;
}

export type SetEingabe = Pick<KartenSet, "name">;

/** Ein rohes Vorder-/Rückseiten-Paar aus manueller Eingabe oder Text-Import. */
export interface KartePaar {
  vorderseite: string;
  rueckseite: string;
}

/** Ergebnis einer einzelnen Karte innerhalb einer Lernrunde. */
export interface LernErgebnis {
  karteId: string;
  vorderseite: string;
  richtig: boolean;
  alteBox: BoxNummer;
  neueBox: BoxNummer;
}

/** Auswahl, welche Karten eine Lernrunde umfasst. */
export type LernBereich =
  | { typ: "alle-faellig" }
  | { typ: "aktiv" }
  | { typ: "set"; setId: string };

/** Kompletter Datenbestand — Grundlage für Laden und Backup. */
export interface DatenBestand {
  sets: KartenSet[];
  karten: Karte[];
}
