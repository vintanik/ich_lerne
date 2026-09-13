// Einzige Storage-Schicht der App. Alles darüber (App, Komponenten) kennt
// nur diese Funktionen, nie IndexedDB direkt — so bleibt eine spätere
// Cloud-Migration (Supabase, analog "Ich koche") ohne Datenmodell-Bruch
// möglich. Die Funktionen sind bereits async, damit sich der Aufruf-Code
// dann nicht ändern muss.

import { ALLE_STORES, idbClear, idbDelete, idbDeleteViele, idbGetAll, idbPut, idbPutViele } from "./idb";
import type { DatenBestand, Karte, KartenSet } from "./types";

const BACKUP_VERSION = 2;
const UI_PREF_KEYS = {
  hintergrund: "ichlerne.hintergrund",
} as const;

// --- Laden ---------------------------------------------------------------

export async function ladeBestand(): Promise<DatenBestand> {
  const [sets, karten] = await Promise.all([idbGetAll<KartenSet>("sets"), idbGetAll<Karte>("karten")]);
  return { sets, karten };
}

// --- Sets --------------------------------------------------------------

export function setSpeichern(set: KartenSet): Promise<void> {
  return idbPut("sets", set);
}

/** Set + zugehörige Karten in einem Rutsch schreiben (neues Set). */
export async function setBundleSpeichern(set: KartenSet, karten: Karte[]): Promise<void> {
  await idbPut("sets", set);
  await idbPutViele("karten", karten);
}

export async function setLoeschen(set: KartenSet, alleKarten: Karte[]): Promise<void> {
  const kartenIds = alleKarten.filter((k) => k.setId === set.id).map((k) => k.id);
  await idbDeleteViele("karten", kartenIds);
  await idbDelete("sets", set.id);
}

// --- Karten ----------------------------------------------------------

export function karteSpeichern(karte: Karte): Promise<void> {
  return idbPut("karten", karte);
}

export function kartenSpeichern(karten: Karte[]): Promise<void> {
  return idbPutViele("karten", karten);
}

export function karteLoeschen(id: string): Promise<void> {
  return idbDelete("karten", id);
}

// --- UI-Präferenzen (rein lokal, kein Backup) ------------------------

export type Hintergrund = "modern" | "vintage";

export function getHintergrund(): Hintergrund {
  return (localStorage.getItem(UI_PREF_KEYS.hintergrund) as Hintergrund | null) ?? "vintage";
}

export function setHintergrund(wert: Hintergrund): void {
  localStorage.setItem(UI_PREF_KEYS.hintergrund, wert);
}

// --- Backup (Export/Import als JSON-Datei) --------------------------

export async function exportiereBackup(): Promise<string> {
  const bestand = await ladeBestand();
  return JSON.stringify(
    { app: "ich-lerne", version: BACKUP_VERSION, erstelltAm: new Date().toISOString(), daten: bestand },
    null,
    2,
  );
}

/**
 * Volles "zurück auf diesen Stand": alle Stores leeren, dann die Zeilen aus
 * der Datei neu einfügen. Ältere Backups (mit "gruppen") werden akzeptiert —
 * das Feld wird ignoriert. UI-Präferenzen bleiben unangetastet.
 */
export async function importiereBackup(json: string): Promise<DatenBestand> {
  const geparst = JSON.parse(json);
  const daten = geparst?.daten;
  if (!daten || !Array.isArray(daten.sets) || !Array.isArray(daten.karten)) {
    throw new Error("Ungültiges Backup-Format");
  }

  const sets = daten.sets as KartenSet[];
  const karten = daten.karten as Karte[];

  for (const store of ALLE_STORES) await idbClear(store);
  await idbPutViele("sets", sets);
  await idbPutViele("karten", karten);

  return { sets, karten };
}
