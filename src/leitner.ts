import type { BoxNummer, Karte, KartePaar, KartenSet } from "./types";

// --- Leitner-Grundwerte (klar benannt, leicht änderbar) -------------------

export const MAX_BOX: BoxNummer = 5;

/** Fälligkeits-Intervall pro Box in Tagen. */
export const BOX_INTERVALL_TAGE: Record<BoxNummer, number> = {
  1: 1, // täglich
  2: 2, // alle 2 Tage
  3: 4, // alle 4 Tage
  4: 7, // wöchentlich
  5: 14, // alle 2 Wochen ("gemeistert", bleibt in der Rotation)
};

export const BOX_INTERVALL_LABEL: Record<BoxNummer, string> = {
  1: "täglich",
  2: "alle 2 Tage",
  3: "alle 4 Tage",
  4: "wöchentlich",
  5: "alle 2 Wochen",
};

export const ALLE_BOXEN: BoxNummer[] = [1, 2, 3, 4, 5];

/** Vorschlag, wie viele Wörter man pro Lerneinheit neu in Box 1 holt. */
export const STANDARD_PORTION = 10;

// --- Datums-Helfer (lokale Kalendertage, keine Uhrzeit) -------------------

export function heuteIso(): string {
  return datumZuIso(new Date());
}

export function datumZuIso(d: Date): string {
  const jahr = d.getFullYear();
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const tag = String(d.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

export function datumPlusTage(basisIso: string, tage: number): string {
  const [j, m, t] = basisIso.split("-").map(Number);
  const d = new Date(j, m - 1, t);
  d.setDate(d.getDate() + tage);
  return datumZuIso(d);
}

export function formatiereDatum(iso: string): string {
  const [j, m, t] = iso.split("-").map(Number);
  const d = new Date(j, m - 1, t);
  return d.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
}

// --- Karten-Zustand ------------------------------------------------------

/** Karte ist in der Box-Rotation (nicht im Vorrat). Altdaten ohne Feld: ja. */
export function istGestartet(karte: Karte): boolean {
  return karte.gestartet ?? true;
}

export function gestarteteKarten(karten: Karte[]): Karte[] {
  return karten.filter(istGestartet);
}

export function vorratKarten(karten: Karte[]): Karte[] {
  return karten.filter((k) => !istGestartet(k));
}

/** Fällig = gestartet UND Wiederholungsdatum heute oder früher. */
export function istFaellig(karte: Karte, heute: string = heuteIso()): boolean {
  return istGestartet(karte) && karte.naechsteWiederholung <= heute;
}

export function naechsteWiederholungFuerBox(box: BoxNummer, abIso: string = heuteIso()): string {
  return datumPlusTage(abIso, BOX_INTERVALL_TAGE[box]);
}

/**
 * Leitner-Kern: "richtig" schiebt eine Box weiter (max. Box 5),
 * "falsch" eine Box zurück (mind. Box 1). Gibt die neuen Feldwerte zurück,
 * ohne die Karte zu mutieren.
 */
export function nachAntwort(
  karte: Karte,
  richtig: boolean,
  heute: string = heuteIso(),
): { box: BoxNummer; naechsteWiederholung: string } {
  const neueBox: BoxNummer = richtig
    ? (Math.min(karte.box + 1, MAX_BOX) as BoxNummer)
    : (Math.max(karte.box - 1, 1) as BoxNummer);
  return { box: neueBox, naechsteWiederholung: naechsteWiederholungFuerBox(neueBox, heute) };
}

// --- Statistik ------------------------------------------------------------

export type BoxVerteilung = Record<BoxNummer, number>;

export function leereBoxVerteilung(): BoxVerteilung {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/** Nur gestartete Karten zählen in die Box-Verteilung. */
export function boxVerteilung(karten: Karte[]): BoxVerteilung {
  const v = leereBoxVerteilung();
  for (const k of karten) if (istGestartet(k)) v[k.box] += 1;
  return v;
}

export function anzahlFaellig(karten: Karte[], heute: string = heuteIso()): number {
  return karten.filter((k) => istFaellig(k, heute)).length;
}

/** Gestartete Karten aus Sets, die als "daran arbeite ich" markiert sind. */
export function aktiveKarten(karten: Karte[], sets: KartenSet[]): Karte[] {
  const aktiveSetIds = new Set(sets.filter((s) => s.aktiv).map((s) => s.id));
  return karten.filter((k) => aktiveSetIds.has(k.setId) && istGestartet(k));
}

// --- Reihenfolge & Vorrat ---------------------------------------------

/** Stabile Sortierung eines Karten-Sets: sortIndex, dann Erstelldatum, dann id. */
export function sortiereKarten(karten: Karte[]): Karte[] {
  return [...karten].sort(
    (a, b) =>
      (a.sortIndex ?? 0) - (b.sortIndex ?? 0) ||
      a.erstelltAm.localeCompare(b.erstelltAm) ||
      a.id.localeCompare(b.id),
  );
}

/** Die nächsten n Vorrats-Karten eines Sets in Lern-Reihenfolge. */
export function naechsteVorratKarten(setKarten: Karte[], n: number): Karte[] {
  return sortiereKarten(vorratKarten(setKarten)).slice(0, Math.max(0, n));
}

/**
 * Holt die genannten Karten aus dem Vorrat in Box 1: gestartet=true, box=1,
 * fällig ab heute. Gibt neue Karten-Objekte zurück (mutiert nichts).
 */
export function karteStarten(karte: Karte, heute: string = heuteIso()): Karte {
  return { ...karte, gestartet: true, box: 1, naechsteWiederholung: heute };
}

// --- Set / Karten anlegen ---------------------------------------------

export interface NeuerSetBundle {
  set: KartenSet;
  karten: Karte[];
}

/**
 * Baut aus rohen Vorder-/Rückseiten-Paaren ein neues Set. Alle Karten landen
 * im Vorrat (gestartet=false) — man holt sie später portionsweise in Box 1.
 * IDs werden clientseitig vergeben (crypto.randomUUID).
 */
export function baueNeuesSet(name: string, paare: KartePaar[]): NeuerSetBundle {
  const jetzt = new Date().toISOString();
  const heute = heuteIso();
  const setId = crypto.randomUUID();
  const set: KartenSet = { id: setId, name: name.trim(), erstelltAm: jetzt };

  const karten: Karte[] = paare.map((paar, i) => ({
    id: crypto.randomUUID(),
    setId,
    sortIndex: i,
    vorderseite: paar.vorderseite.trim(),
    rueckseite: paar.rueckseite.trim(),
    gestartet: false,
    box: 1,
    naechsteWiederholung: heute,
    erstelltAm: jetzt,
  }));

  return { set, karten };
}

/** Neue Karten für ein bestehendes Set — hinten im Vorrat angehängt. */
export function baueKarten(setId: string, bestehendeSetKarten: Karte[], paare: KartePaar[]): Karte[] {
  const jetzt = new Date().toISOString();
  const heute = heuteIso();
  const startIndex = bestehendeSetKarten.reduce((max, k) => Math.max(max, k.sortIndex ?? 0), 0) + 1;
  return paare.map((paar, i) => ({
    id: crypto.randomUUID(),
    setId,
    sortIndex: startIndex + i,
    vorderseite: paar.vorderseite.trim(),
    rueckseite: paar.rueckseite.trim(),
    gestartet: false,
    box: 1,
    naechsteWiederholung: heute,
    erstelltAm: jetzt,
  }));
}

// --- Sonstiges ----------------------------------------------------------

/** Fisher–Yates, gibt eine neue Liste zurück. */
export function mische<T>(items: T[]): T[] {
  const kopie = [...items];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
