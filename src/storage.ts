// Einzige Storage-Schicht der App. Alles darüber (App, Komponenten) kennt
// nur diese Funktionen, nie Supabase direkt. Seit der Cloud-Umstellung ist
// dies die alleinige Live-Quelle (Sets/Karten) — reines IndexedDB-Backend
// (idb.ts) wird nur noch von cloudMigration.ts für die einmalige
// Altdaten-Übernahme gelesen, siehe dort.

import { supabase } from "./supabaseClient";
import type { BoxNummer, DatenBestand, Karte, KartenSet } from "./types";

const KEYS = {
  hintergrund: "ichlerne.hintergrund",
  migrationAngeboten: "ichlerne.migrationAngeboten",
} as const;

// --- Sets --------------------------------------------------------------

interface SetZeile {
  id: string;
  name: string;
  aktiv: boolean;
  erstellt_am: string;
}

function zeileZuSet(z: SetZeile): KartenSet {
  return { id: z.id, name: z.name, aktiv: z.aktiv, erstelltAm: z.erstellt_am };
}

const SET_SELECT = "id, name, aktiv, erstellt_am";

export async function setSpeichern(set: KartenSet): Promise<void> {
  const { error } = await supabase.from("sets").update({ name: set.name, aktiv: set.aktiv ?? false }).eq("id", set.id);
  if (error) throw error;
}

/** Set + zugehörige Karten in einem Rutsch schreiben (neues Set). */
export async function setBundleSpeichern(set: KartenSet, karten: Karte[]): Promise<void> {
  const { error: setError } = await supabase
    .from("sets")
    .insert({ id: set.id, name: set.name, aktiv: set.aktiv ?? false, erstellt_am: set.erstelltAm });
  if (setError) throw setError;
  if (karten.length > 0) {
    const { error: kartenError } = await supabase.from("karten").insert(karten.map(karteZuZeile));
    if (kartenError) throw kartenError;
  }
}

// Die Karten werden serverseitig automatisch mitgelöscht (on delete cascade,
// siehe supabase/migrations/0001_init.sql) — hier reicht das Set selbst.
export async function setLoeschen(set: KartenSet): Promise<void> {
  const { error } = await supabase.from("sets").delete().eq("id", set.id);
  if (error) throw error;
}

// --- Karten ----------------------------------------------------------

interface KarteZeile {
  id: string;
  set_id: string;
  sort_index: number;
  vorderseite: string;
  rueckseite: string;
  bild_base64: string | null;
  gestartet: boolean;
  box: number;
  naechste_wiederholung: string;
  erstellt_am: string;
}

function zeileZuKarte(z: KarteZeile): Karte {
  return {
    id: z.id,
    setId: z.set_id,
    sortIndex: z.sort_index,
    vorderseite: z.vorderseite,
    rueckseite: z.rueckseite,
    bildBase64: z.bild_base64 ?? undefined,
    gestartet: z.gestartet,
    box: z.box as BoxNummer,
    naechsteWiederholung: z.naechste_wiederholung,
    erstelltAm: z.erstellt_am,
  };
}

function karteZuZeile(k: Karte) {
  return {
    id: k.id,
    set_id: k.setId,
    sort_index: k.sortIndex ?? 0,
    vorderseite: k.vorderseite,
    rueckseite: k.rueckseite,
    bild_base64: k.bildBase64 ?? null,
    gestartet: k.gestartet ?? false,
    box: k.box,
    naechste_wiederholung: k.naechsteWiederholung,
    erstellt_am: k.erstelltAm,
  };
}

const KARTE_SELECT = "id, set_id, sort_index, vorderseite, rueckseite, bild_base64, gestartet, box, naechste_wiederholung, erstellt_am";

// karteSpeichern/kartenSpeichern decken sowohl neue (Import, Einzelkarte) als
// auch bestehende Karten (Bewertung, Bearbeiten, Vorrat starten) ab — daher
// upsert statt insert/update getrennt zu halten.
export async function karteSpeichern(karte: Karte): Promise<void> {
  const { error } = await supabase.from("karten").upsert(karteZuZeile(karte));
  if (error) throw error;
}

export async function kartenSpeichern(karten: Karte[]): Promise<void> {
  if (karten.length === 0) return;
  const { error } = await supabase.from("karten").upsert(karten.map(karteZuZeile));
  if (error) throw error;
}

export async function karteLoeschen(id: string): Promise<void> {
  const { error } = await supabase.from("karten").delete().eq("id", id);
  if (error) throw error;
}

// --- Laden ---------------------------------------------------------------

export async function ladeBestand(): Promise<DatenBestand> {
  const [setsRes, kartenRes] = await Promise.all([
    supabase.from("sets").select(SET_SELECT).order("erstellt_am", { ascending: true }),
    supabase.from("karten").select(KARTE_SELECT),
  ]);
  if (setsRes.error) throw setsRes.error;
  if (kartenRes.error) throw kartenRes.error;
  return {
    sets: (setsRes.data as SetZeile[]).map(zeileZuSet),
    karten: (kartenRes.data as KarteZeile[]).map(zeileZuKarte),
  };
}

// --- UI-Präferenzen (rein lokal, kein Backup, kein Sync) ------------

export type Hintergrund = "modern" | "vintage";

export function getHintergrund(): Hintergrund {
  return (localStorage.getItem(KEYS.hintergrund) as Hintergrund | null) ?? "vintage";
}

export function setHintergrund(wert: Hintergrund): void {
  localStorage.setItem(KEYS.hintergrund, wert);
}

// Steuert die einmalige "lokale Daten ins Konto übernehmen?"-Nachfrage nach
// dem allerersten Cloud-Login — pro Browser nur einmal.
export function wurdeMigrationAngeboten(): boolean {
  return localStorage.getItem(KEYS.migrationAngeboten) === "true";
}

export function setMigrationAngeboten(): void {
  localStorage.setItem(KEYS.migrationAngeboten, "true");
}

// --- Backup (Export/Import als JSON-Datei) --------------------------
//
// Exportiert werden die rohen Tabellenzeilen unverändert (kein Umweg über
// die App-Typen) — "wiederherstellen" ist dadurch ein einfaches
// Löschen+Neueinfügen derselben Zeilen, wie bei "Ich koche".

export async function exportiereBackup(): Promise<string> {
  const [setsRes, kartenRes] = await Promise.all([
    supabase.from("sets").select("*"),
    supabase.from("karten").select("*"),
  ]);
  if (setsRes.error) throw setsRes.error;
  if (kartenRes.error) throw kartenRes.error;

  return JSON.stringify(
    {
      app: "ich-lerne",
      version: 3,
      erstelltAm: new Date().toISOString(),
      tabellen: { sets: setsRes.data, karten: kartenRes.data },
    },
    null,
    2,
  );
}

/**
 * Volles "zurück auf diesen Stand": bestehende Zeilen beider Tabellen werden
 * gelöscht (karten kaskadiert automatisch über sets), danach die Zeilen aus
 * der Datei neu eingefügt.
 */
export async function importiereBackup(json: string): Promise<DatenBestand> {
  const geparst = JSON.parse(json);
  const tabellen = geparst?.tabellen;
  if (!tabellen || !Array.isArray(tabellen.sets) || !Array.isArray(tabellen.karten)) {
    throw new Error("Ungültiges Backup-Format");
  }
  const setZeilen = tabellen.sets as SetZeile[];
  const kartenZeilen = tabellen.karten as KarteZeile[];

  const { error: setsDelError } = await supabase.from("sets").delete().not("id", "is", null);
  if (setsDelError) throw setsDelError;

  if (setZeilen.length > 0) {
    const { error } = await supabase.from("sets").insert(setZeilen);
    if (error) throw error;
  }
  if (kartenZeilen.length > 0) {
    const { error } = await supabase.from("karten").insert(kartenZeilen);
    if (error) throw error;
  }

  return { sets: setZeilen.map(zeileZuSet), karten: kartenZeilen.map(zeileZuKarte) };
}
