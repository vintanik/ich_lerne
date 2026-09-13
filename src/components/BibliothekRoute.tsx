import { useState } from "react";
import { anzahlFaellig, gestarteteKarten, vorratKarten } from "../leitner";
import type { Karte, KartePaar, KartenSet, LernBereich, SetEingabe } from "../types";
import { BoxBalken } from "./BoxBalken";
import { KarteForm, type KarteFormDaten } from "./KarteForm";
import { KartenVerwaltung } from "./KartenVerwaltung";
import { SetForm } from "./SetForm";
import { SetUebeSeite } from "./SetUebeSeite";

interface Props {
  sets: KartenSet[];
  karten: Karte[];
  onSetErstellen: (eingabe: SetEingabe, paare: KartePaar[]) => KartenSet;
  onSetAktualisieren: (setId: string, updates: Partial<KartenSet>) => void;
  onSetLoeschen: (setId: string) => void;
  onKarteErstellen: (
    setId: string,
    daten: { vorderseite: string; rueckseite: string; bildBase64?: string },
  ) => Karte;
  onKartenImportieren: (setId: string, paare: KartePaar[]) => void;
  onKarteAendern: (
    karteId: string,
    updates: { vorderseite?: string; rueckseite?: string; bildBase64?: string | undefined },
  ) => void;
  onKarteLoeschen: (karteId: string) => void;
  onWoerterStarten: (karteIds: string[]) => void;
  onLernen: (bereich: LernBereich) => void;
}

type View =
  | { typ: "liste" }
  | { typ: "form" }
  | { typ: "uebe"; setId: string }
  | { typ: "verwalten"; setId: string }
  | { typ: "karte-neu"; setId: string }
  | { typ: "karte-edit"; setId: string; karteId: string };

export function BibliothekRoute(props: Props) {
  const { sets, karten } = props;
  const [view, setView] = useState<View>({ typ: "liste" });

  const kartenVon = (setId: string) => karten.filter((k) => k.setId === setId);
  const setVon = (setId: string) => sets.find((s) => s.id === setId);

  const nichtGefunden = (text: string) => (
    <div>
      <p className="empty-state">{text}</p>
      <button className="btn secondary" onClick={() => setView({ typ: "liste" })}>
        ← Ganze Bibliothek
      </button>
    </div>
  );

  // --- Neues Set -------------------------------------------------------
  if (view.typ === "form") {
    return (
      <SetForm
        onSpeichern={(eingabe, paare) => {
          const neu = props.onSetErstellen(eingabe, paare);
          setView({ typ: "uebe", setId: neu.id });
        }}
        onAbbrechen={() => setView({ typ: "liste" })}
      />
    );
  }

  // --- Karte anlegen -------------------------------------------------
  if (view.typ === "karte-neu") {
    return (
      <KarteForm
        onSpeichern={(daten: KarteFormDaten) => {
          props.onKarteErstellen(view.setId, {
            vorderseite: daten.vorderseite,
            rueckseite: daten.rueckseite,
            bildBase64: daten.bildBase64,
          });
          setView({ typ: "verwalten", setId: view.setId });
        }}
        onAbbrechen={() => setView({ typ: "verwalten", setId: view.setId })}
      />
    );
  }

  // --- Karte bearbeiten --------------------------------------------
  if (view.typ === "karte-edit") {
    const karte = karten.find((k) => k.id === view.karteId);
    if (!karte) return nichtGefunden("Diese Karte existiert nicht mehr.");
    return (
      <KarteForm
        bestehendeKarte={karte}
        onSpeichern={(daten: KarteFormDaten) => {
          props.onKarteAendern(karte.id, {
            vorderseite: daten.vorderseite,
            rueckseite: daten.rueckseite,
            bildBase64: daten.bildBase64,
          });
          setView({ typ: "verwalten", setId: view.setId });
        }}
        onAbbrechen={() => setView({ typ: "verwalten", setId: view.setId })}
      />
    );
  }

  // --- Karten verwalten ------------------------------------------
  if (view.typ === "verwalten") {
    const set = setVon(view.setId);
    if (!set) return nichtGefunden("Dieses Set existiert nicht mehr.");
    return (
      <KartenVerwaltung
        set={set}
        karten={kartenVon(set.id)}
        onZurueck={() => setView({ typ: "uebe", setId: set.id })}
        onNeueKarte={() => setView({ typ: "karte-neu", setId: set.id })}
        onKarteBearbeiten={(karteId) => setView({ typ: "karte-edit", setId: set.id, karteId })}
        onKarteLoeschen={props.onKarteLoeschen}
        onKartenImportieren={(paare) => props.onKartenImportieren(set.id, paare)}
      />
    );
  }

  // --- Set-Übe-Startseite --------------------------------------
  if (view.typ === "uebe") {
    const set = setVon(view.setId);
    if (!set) return nichtGefunden("Dieses Set existiert nicht mehr.");
    return (
      <SetUebeSeite
        set={set}
        karten={kartenVon(set.id)}
        onZurueck={() => setView({ typ: "liste" })}
        onUmbenennen={(name) => props.onSetAktualisieren(set.id, { name })}
        onLoeschen={() => {
          props.onSetLoeschen(set.id);
          setView({ typ: "liste" });
        }}
        onAktivSetzen={(aktiv) => props.onSetAktualisieren(set.id, { aktiv })}
        onWoerterStarten={props.onWoerterStarten}
        onVerwalten={() => setView({ typ: "verwalten", setId: set.id })}
        onLernen={() => props.onLernen({ typ: "set", setId: set.id })}
      />
    );
  }

  // --- Liste aller Sets --------------------------------------
  return (
    <div>
      <div className="zeile-zwischen">
        <h2 style={{ margin: 0 }}>Bibliothek</h2>
        <button className="btn" onClick={() => setView({ typ: "form" })}>
          + Neues Set
        </button>
      </div>

      {sets.length === 0 ? (
        <p className="empty-state">Noch keine Sets. Leg dein erstes an.</p>
      ) : (
        sets.map((set) => {
          const sKarten = kartenVon(set.id);
          const gestartet = gestarteteKarten(sKarten);
          const vorrat = vorratKarten(sKarten).length;
          return (
            <button className="listenzeile" key={set.id} onClick={() => setView({ typ: "uebe", setId: set.id })}>
              <div className="stapel" style={{ flex: 1 }}>
                <span className="listenzeile-titel">
                  {set.name}
                  {set.aktiv && <span className="mini-box-marke aktiv-marke"> aktiv</span>}
                </span>
                <span className="note" style={{ margin: 0 }}>
                  {gestartet.length} im Lernen · {vorrat} im Vorrat · {anzahlFaellig(sKarten)} fällig
                </span>
                {gestartet.length > 0 && (
                  <div style={{ maxWidth: "220px" }}>
                    <BoxBalken karten={gestartet} mitLegende={false} />
                  </div>
                )}
              </div>
              <span aria-hidden>›</span>
            </button>
          );
        })
      )}
    </div>
  );
}
