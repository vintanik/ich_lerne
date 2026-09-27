// Sets/Ordner per Link teilen (öffentlich, ohne Login) — bewusst getrennt
// von storage.ts (gleiches Prinzip wie cloudMigration.ts): eine Freigabe ist
// eine eigenständige, zum Zeitpunkt des Teilens eingefrorene Kopie, kein
// Live-Verweis auf das Original. Siehe supabase/migrations/0004_freigaben.sql.

import { sortiereKarten } from "./leitner";
import { direkteKinderOrdner } from "./ordner";
import { supabase } from "./supabaseClient";
import type { GeteilterOrdnerKnoten, GeteiltesSet, Karte, KartenSet, Ordner } from "./types";

function setZuGeteiltesSet(set: KartenSet, alleKarten: Karte[]): GeteiltesSet {
  const karten = sortiereKarten(alleKarten.filter((k) => k.setId === set.id));
  return { name: set.name, karten: karten.map((k) => ({ vorderseite: k.vorderseite, rueckseite: k.rueckseite })) };
}

function ordnerZuKnoten(ordner: Ordner, alleOrdner: Ordner[], alleSets: KartenSet[], alleKarten: Karte[]): GeteilterOrdnerKnoten {
  const kinder = direkteKinderOrdner(alleOrdner, ordner.id).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const hierSets = alleSets.filter((s) => (s.ordnerId ?? null) === ordner.id);
  return {
    name: ordner.name,
    sets: hierSets.map((s) => setZuGeteiltesSet(s, alleKarten)),
    unterordner: kinder.map((k) => ordnerZuKnoten(k, alleOrdner, alleSets, alleKarten)),
  };
}

export async function erstelleSetFreigabe(set: KartenSet, alleKarten: Karte[]): Promise<string> {
  const geteiltesSet = setZuGeteiltesSet(set, alleKarten);
  const { data, error } = await supabase
    .from("kartenset_freigaben")
    .insert({ ursprungs_set_id: set.id, name: geteiltesSet.name, karten: geteiltesSet.karten })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function erstelleOrdnerFreigabe(
  ordner: Ordner,
  alleOrdner: Ordner[],
  alleSets: KartenSet[],
  alleKarten: Karte[],
): Promise<string> {
  const knoten = ordnerZuKnoten(ordner, alleOrdner, alleSets, alleKarten);
  const { data, error } = await supabase
    .from("ordner_freigaben")
    .insert({ ursprungs_ordner_id: ordner.id, name: knoten.name, inhalt: knoten })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

// Funktionieren mit und ohne Login (RPC-Grant an anon + authenticated).

export async function holeGeteiltesSet(token: string): Promise<GeteiltesSet | null> {
  const { data, error } = await supabase.rpc("get_geteiltes_set", { p_token: token });
  if (error) throw error;
  const zeilen = data as GeteiltesSet[] | null;
  if (!zeilen || zeilen.length === 0) return null;
  return zeilen[0];
}

export async function holeGeteiltenOrdner(token: string): Promise<GeteilterOrdnerKnoten | null> {
  const { data, error } = await supabase.rpc("get_geteilten_ordner", { p_token: token });
  if (error) throw error;
  const zeilen = data as { name: string; inhalt: GeteilterOrdnerKnoten }[] | null;
  if (!zeilen || zeilen.length === 0) return null;
  return zeilen[0].inhalt;
}

export function teilenLink(typ: "set" | "ordner", token: string): string {
  return `${window.location.origin}/geteilt/${typ}/${token}`;
}
