// Einmalige Übernahme bestehender IndexedDB-Daten in ein frisch angelegtes
// Supabase-Konto. Der laufende Betrieb liest/schreibt seit der Cloud-
// Umstellung nur noch Supabase — dieses Modul befüllt die Cloud-Tabellen
// einmalig aus echten, alten IndexedDB-Resten von VOR der Umstellung.
//
// WICHTIG: Dieses Modul liest bewusst NICHT über storage.ts (das ist seit
// der Umstellung selbst Supabase-backed und würde hier die eigenen
// Cloud-Daten des Kontos zurückliefern statt echter lokaler Altdaten).
// Stattdessen liest es direkt und eigenständig aus IndexedDB — analog zu
// "Ich koche"s cloudMigration.ts (dort localStorage statt IndexedDB).
import { idbGetAll } from "./idb";
import { supabase } from "./supabaseClient";
import type { Karte, KartenSet } from "./types";

export async function hatLokaleDaten(): Promise<boolean> {
  const [sets, karten] = await Promise.all([idbGetAll<KartenSet>("sets"), idbGetAll<Karte>("karten")]);
  return sets.length > 0 || karten.length > 0;
}

export async function uebertrageLokaleDatenInsKonto(userId: string): Promise<void> {
  const [sets, karten] = await Promise.all([idbGetAll<KartenSet>("sets"), idbGetAll<Karte>("karten")]);
  if (sets.length === 0 && karten.length === 0) return;

  const setZeilen = sets.map((s) => ({
    id: s.id,
    user_id: userId,
    name: s.name,
    erstellt_am: s.erstelltAm,
  }));
  if (setZeilen.length > 0) {
    const { error } = await supabase.from("sets").insert(setZeilen);
    if (error) throw error;
  }

  const kartenZeilen = karten.map((k) => ({
    id: k.id,
    set_id: k.setId,
    user_id: userId,
    sort_index: k.sortIndex ?? 0,
    vorderseite: k.vorderseite,
    rueckseite: k.rueckseite,
    bild_base64: k.bildBase64 ?? null,
    gestartet: k.gestartet ?? true,
    box: k.box,
    naechste_wiederholung: k.naechsteWiederholung,
    erstellt_am: k.erstelltAm,
  }));
  if (kartenZeilen.length > 0) {
    const { error } = await supabase.from("karten").insert(kartenZeilen);
    if (error) throw error;
  }
}
