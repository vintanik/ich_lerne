import { useState } from "react";
import { anzahlFaellig, gestarteteKarten, vorratKarten } from "../leitner";
import { direkteKinderOrdner, ordnerPfad } from "../ordner";
import type { Karte, KartePaar, KartenSet, LernBereich, Ordner, OrdnerEingabe, SetEingabe } from "../types";
import { BoxBalken } from "./BoxBalken";
import { ConfirmDialog } from "./ConfirmDialog";
import { KarteForm, type KarteFormDaten } from "./KarteForm";
import { KartenVerwaltung } from "./KartenVerwaltung";
import { SetForm } from "./SetForm";
import { SetUebeSeite } from "./SetUebeSeite";

interface Props {
  sets: KartenSet[];
  karten: Karte[];
  ordner: Ordner[];
  onSetErstellen: (eingabe: SetEingabe, paare: KartePaar[], ordnerId?: string | null) => KartenSet;
  onSetAktualisieren: (setId: string, updates: Partial<KartenSet>) => void;
  onSetLoeschen: (setId: string) => void;
  onOrdnerErstellen: (eingabe: OrdnerEingabe) => Ordner;
  onOrdnerUmbenennen: (ordnerId: string, name: string) => void;
  onOrdnerLoeschen: (ordnerId: string) => void;
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
  | { typ: "liste"; ordnerId: string | null }
  | { typ: "ordner-form"; parentId: string | null }
  | { typ: "set-form"; ordnerId: string | null }
  | { typ: "uebe"; setId: string }
  | { typ: "verwalten"; setId: string }
  | { typ: "karte-neu"; setId: string }
  | { typ: "karte-edit"; setId: string; karteId: string };

export function BibliothekRoute(props: Props) {
  const { sets, karten, ordner } = props;
  const [view, setView] = useState<View>({ typ: "liste", ordnerId: null });
  const [ordnerUmbenennenId, setOrdnerUmbenennenId] = useState<string | null>(null);
  const [ordnerNameEntwurf, setOrdnerNameEntwurf] = useState("");
  const [ordnerLoeschKandidat, setOrdnerLoeschKandidat] = useState<Ordner | null>(null);

  const kartenVon = (setId: string) => karten.filter((k) => k.setId === setId);
  const setVon = (setId: string) => sets.find((s) => s.id === setId);

  const nichtGefunden = (text: string) => (
    <div>
      <p className="empty-state">{text}</p>
      <button className="btn secondary" onClick={() => setView({ typ: "liste", ordnerId: null })}>
        ← Ganze Bibliothek
      </button>
    </div>
  );

  // --- Neuer Ordner ----------------------------------------------------
  if (view.typ === "ordner-form") {
    return (
      <OrdnerForm
        onSpeichern={(name) => {
          const neu = props.onOrdnerErstellen({ name, parentId: view.parentId });
          setView({ typ: "liste", ordnerId: neu.parentId });
        }}
        onAbbrechen={() => setView({ typ: "liste", ordnerId: view.parentId })}
      />
    );
  }

  // --- Neues Set -------------------------------------------------------
  if (view.typ === "set-form") {
    return (
      <SetForm
        onSpeichern={(eingabe, paare) => {
          const neu = props.onSetErstellen(eingabe, paare, view.ordnerId);
          setView({ typ: "uebe", setId: neu.id });
        }}
        onAbbrechen={() => setView({ typ: "liste", ordnerId: view.ordnerId })}
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
        ordner={ordner}
        onZurueck={() => setView({ typ: "liste", ordnerId: set.ordnerId ?? null })}
        onUmbenennen={(name) => props.onSetAktualisieren(set.id, { name })}
        onOrdnerZuweisen={(ordnerId) => props.onSetAktualisieren(set.id, { ordnerId })}
        onLoeschen={() => {
          props.onSetLoeschen(set.id);
          setView({ typ: "liste", ordnerId: set.ordnerId ?? null });
        }}
        onWoerterStarten={props.onWoerterStarten}
        onVerwalten={() => setView({ typ: "verwalten", setId: set.id })}
        onLernen={() => props.onLernen({ typ: "set", setId: set.id })}
        onBoxUeben={(box) => props.onLernen({ typ: "box", setId: set.id, box })}
      />
    );
  }

  // --- Liste: Ordner + Sets der aktuellen Ebene --------------------
  const aktuelleOrdnerId = view.ordnerId;
  const unterOrdner = direkteKinderOrdner(ordner, aktuelleOrdnerId).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const hierSets = sets.filter((s) => (s.ordnerId ?? null) === aktuelleOrdnerId);
  const pfad = ordnerPfad(aktuelleOrdnerId, ordner);
  const aktuellerOrdner = pfad[pfad.length - 1];

  function ordnerZaehlung(o: Ordner) {
    const kinder = direkteKinderOrdner(ordner, o.id).length;
    const eigeneSets = sets.filter((s) => (s.ordnerId ?? null) === o.id).length;
    const teile = [];
    if (kinder > 0) teile.push(`${kinder} Ordner`);
    teile.push(`${eigeneSets} ${eigeneSets === 1 ? "Set" : "Sets"}`);
    return teile.join(" · ");
  }

  return (
    <div>
      {pfad.length > 0 && (
        <p className="note" style={{ marginBottom: "0.5rem" }}>
          <button className="link-btn" onClick={() => setView({ typ: "liste", ordnerId: null })}>
            Bibliothek
          </button>
          {pfad.map((o, i) => (
            <span key={o.id}>
              {" / "}
              {i === pfad.length - 1 ? (
                o.name
              ) : (
                <button className="link-btn" onClick={() => setView({ typ: "liste", ordnerId: o.id })}>
                  {o.name}
                </button>
              )}
            </span>
          ))}
        </p>
      )}

      <div className="zeile-zwischen">
        {ordnerUmbenennenId === aktuellerOrdner?.id ? (
          <div className="field" style={{ flex: 1, marginBottom: 0, marginRight: "0.75rem" }}>
            <input
              type="text"
              value={ordnerNameEntwurf}
              onChange={(e) => setOrdnerNameEntwurf(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <h2 style={{ margin: 0 }}>{aktuellerOrdner ? aktuellerOrdner.name : "Bibliothek"}</h2>
        )}
        <div className="btn-row" style={{ marginBottom: 0, flexWrap: "nowrap" }}>
          <button className="btn secondary klein" onClick={() => setView({ typ: "ordner-form", parentId: aktuelleOrdnerId })}>
            + Ordner
          </button>
          <button className="btn klein" onClick={() => setView({ typ: "set-form", ordnerId: aktuelleOrdnerId })}>
            + Set
          </button>
        </div>
      </div>

      {aktuellerOrdner && (
        <div className="btn-row" style={{ marginTop: "0.4rem", marginBottom: "1rem" }}>
          {ordnerUmbenennenId === aktuellerOrdner.id ? (
            <>
              <button
                className="link-btn"
                onClick={() => {
                  if (ordnerNameEntwurf.trim()) props.onOrdnerUmbenennen(aktuellerOrdner.id, ordnerNameEntwurf.trim());
                  setOrdnerUmbenennenId(null);
                }}
              >
                speichern
              </button>
              <button className="link-btn" onClick={() => setOrdnerUmbenennenId(null)}>
                abbrechen
              </button>
            </>
          ) : (
            <>
              <button
                className="link-btn"
                onClick={() => {
                  setOrdnerUmbenennenId(aktuellerOrdner.id);
                  setOrdnerNameEntwurf(aktuellerOrdner.name);
                }}
              >
                umbenennen
              </button>
              <button className="link-btn" onClick={() => setOrdnerLoeschKandidat(aktuellerOrdner)}>
                löschen
              </button>
            </>
          )}
        </div>
      )}

      {ordnerLoeschKandidat && (
        <div style={{ marginBottom: "1rem" }}>
          <ConfirmDialog
            frage={`Ordner „${ordnerLoeschKandidat.name}“ löschen? Enthaltene Ordner/Sets bleiben erhalten und rutschen eine Ebene hoch.`}
            bestaetigenText="Ja, Ordner löschen"
            onBestaetigen={() => {
              props.onOrdnerLoeschen(ordnerLoeschKandidat.id);
              setOrdnerLoeschKandidat(null);
              setView({ typ: "liste", ordnerId: ordnerLoeschKandidat.parentId });
            }}
            onAbbrechen={() => setOrdnerLoeschKandidat(null)}
          />
        </div>
      )}

      {unterOrdner.length === 0 && hierSets.length === 0 ? (
        <p className="empty-state">
          {aktuellerOrdner ? "Dieser Ordner ist leer." : "Noch keine Sets oder Ordner. Leg los."}
        </p>
      ) : (
        <>
          {unterOrdner.map((o) => (
            <button className="listenzeile" key={o.id} onClick={() => setView({ typ: "liste", ordnerId: o.id })}>
              <div className="stapel" style={{ flex: 1 }}>
                <span className="listenzeile-titel">📁 {o.name}</span>
                <span className="note" style={{ margin: 0 }}>
                  {ordnerZaehlung(o)}
                </span>
              </div>
              <span aria-hidden>›</span>
            </button>
          ))}

          {hierSets.map((set) => {
            const sKarten = kartenVon(set.id);
            const gestartet = gestarteteKarten(sKarten);
            const vorrat = vorratKarten(sKarten).length;
            return (
              <button className="listenzeile" key={set.id} onClick={() => setView({ typ: "uebe", setId: set.id })}>
                <div className="stapel" style={{ flex: 1 }}>
                  <span className="listenzeile-titel">{set.name}</span>
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
          })}
        </>
      )}
    </div>
  );
}

function OrdnerForm({ onSpeichern, onAbbrechen }: { onSpeichern: (name: string) => void; onAbbrechen: () => void }) {
  const [name, setName] = useState("");

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSpeichern(name.trim());
  }

  return (
    <form onSubmit={absenden}>
      <div className="zurueck-zeile">
        <button type="button" className="btn secondary" onClick={onAbbrechen}>
          ← Abbrechen
        </button>
      </div>

      <h2>Neuer Ordner</h2>

      <div className="field">
        <label htmlFor="ordner-name">Name</label>
        <input
          id="ordner-name"
          type="text"
          placeholder="z. B. Englisch"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="btn-row">
        <button type="submit" className="btn" disabled={!name.trim()}>
          Ordner anlegen
        </button>
      </div>
    </form>
  );
}
