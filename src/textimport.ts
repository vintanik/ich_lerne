import type { KartePaar } from "./types";

// Trenner-Erkennung für den Zeile-für-Zeile-Import ("Begriff — Übersetzung").
// "auto" probiert die Kandidaten der Reihe nach pro Zeile durch.

export type TrennerModus = "auto" | "tab" | "gedankenstrich" | "bindestrich" | "semikolon" | "komma";

export const TRENNER_OPTIONEN: { wert: TrennerModus; label: string }[] = [
  { wert: "auto", label: "Automatisch erkennen" },
  { wert: "tab", label: "Tabulator" },
  { wert: "gedankenstrich", label: "Gedankenstrich  —  bzw.  –" },
  { wert: "bindestrich", label: "Bindestrich  -  (mit Leerzeichen)" },
  { wert: "semikolon", label: "Semikolon  ;" },
  { wert: "komma", label: "Komma  ," },
];

// Reihenfolge = Priorität bei "auto". Tab zuerst (aus Tabellen kopiert),
// dann die typografischen Striche, dann der Rest.
const AUTO_KANDIDATEN: { modus: Exclude<TrennerModus, "auto">; regex: RegExp }[] = [
  { modus: "tab", regex: /\t+/ },
  { modus: "gedankenstrich", regex: /\s+[—–]\s+/ },
  { modus: "bindestrich", regex: /\s+-\s+/ },
  { modus: "semikolon", regex: /\s*;\s*/ },
  { modus: "komma", regex: /\s*,\s*/ },
];

function regexFuer(modus: Exclude<TrennerModus, "auto">): RegExp {
  return AUTO_KANDIDATEN.find((k) => k.modus === modus)!.regex;
}

function zeileTeilen(zeile: string, modus: TrennerModus): KartePaar | null {
  const kandidaten = modus === "auto" ? AUTO_KANDIDATEN.map((k) => k.regex) : [regexFuer(modus)];
  for (const regex of kandidaten) {
    const teile = zeile.split(regex);
    if (teile.length >= 2) {
      const vorderseite = teile[0].trim();
      // mehr als ein Trenner in der Zeile: Rest wieder zusammenfügen
      const rueckseite = teile.slice(1).join(" ").trim();
      if (vorderseite && rueckseite) return { vorderseite, rueckseite };
    }
  }
  return null;
}

export interface ImportErgebnis {
  paare: KartePaar[];
  /** Zeilen mit Inhalt, bei denen kein Trenner gefunden wurde. */
  uebersprungen: string[];
}

export function parseImport(text: string, modus: TrennerModus): ImportErgebnis {
  const paare: KartePaar[] = [];
  const uebersprungen: string[] = [];
  for (const rohzeile of text.split(/\r?\n/)) {
    const zeile = rohzeile.trim();
    if (!zeile) continue;
    const paar = zeileTeilen(zeile, modus);
    if (paar) paare.push(paar);
    else uebersprungen.push(zeile);
  }
  return { paare, uebersprungen };
}
