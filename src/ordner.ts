// Reine Baum-Helfer für Ordner — bewusst getrennt von leitner.ts (das ist
// Leitner-Fachlogik, hier geht's nur um die Ordnerstruktur der Bibliothek).
import type { Ordner } from "./types";

export function baueOrdner(name: string, parentId: string | null): Ordner {
  return { id: crypto.randomUUID(), name: name.trim(), parentId, erstelltAm: new Date().toISOString() };
}

/** Direkte Unter-Ordner eines Elternordners (null = Wurzelebene). */
export function direkteKinderOrdner(alleOrdner: Ordner[], parentId: string | null): Ordner[] {
  return alleOrdner.filter((o) => (o.parentId ?? null) === parentId);
}

/** Kette von der Wurzel bis zum gegebenen Ordner (für die Brotkrumen-Navigation). */
export function ordnerPfad(ordnerId: string | null, alleOrdner: Ordner[]): Ordner[] {
  const pfad: Ordner[] = [];
  let aktuelleId = ordnerId;
  while (aktuelleId) {
    const o = alleOrdner.find((x) => x.id === aktuelleId);
    if (!o) break;
    pfad.unshift(o);
    aktuelleId = o.parentId;
  }
  return pfad;
}

/** Ein Ordner in der flachen Baumliste, mit seiner Verschachtelungstiefe. */
export interface OrdnerOption {
  ordner: Ordner;
  tiefe: number;
}

/** Für die "Ordner wechseln"-Auswahl: alle Ordner flach, eingerückt nach Tiefe. */
export function ordnerBaumFlach(alleOrdner: Ordner[]): OrdnerOption[] {
  const ergebnis: OrdnerOption[] = [];
  function rekursiv(parentId: string | null, tiefe: number) {
    const kinder = direkteKinderOrdner(alleOrdner, parentId).sort((a, b) => a.name.localeCompare(b.name, "de"));
    for (const o of kinder) {
      ergebnis.push({ ordner: o, tiefe });
      rekursiv(o.id, tiefe + 1);
    }
  }
  rekursiv(null, 0);
  return ergebnis;
}
