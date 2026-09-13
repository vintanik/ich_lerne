import { useEffect, useState } from "react";
import { baueKarten, baueNeuesSet, heuteIso, karteStarten, nachAntwort } from "./leitner";
import {
  exportiereBackup,
  getHintergrund,
  importiereBackup,
  karteLoeschen,
  karteSpeichern,
  kartenSpeichern,
  ladeBestand,
  setBundleSpeichern,
  setHintergrund as speichereHintergrund,
  setLoeschen,
  setSpeichern,
  type Hintergrund,
} from "./storage";
import type { DatenBestand, Karte, KartePaar, KartenSet, LernBereich, SetEingabe } from "./types";
import { BibliothekRoute } from "./components/BibliothekRoute";
import { DaranArbeiteIchRoute } from "./components/DaranArbeiteIchRoute";
import { EinstellungenRoute } from "./components/EinstellungenRoute";
import { FehlerBanner } from "./components/FehlerBanner";
import { LernenRoute } from "./components/LernenRoute";

type Ansicht = "arbeit" | "bibliothek" | "lernen" | "einstellungen";

function App() {
  const [sets, setSets] = useState<KartenSet[]>([]);
  const [karten, setKarten] = useState<Karte[]>([]);
  const [datenZustand, setDatenZustand] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const [ladeVersuch, setLadeVersuch] = useState(0);
  const [fehlermeldung, setFehlermeldung] = useState<string | null>(null);

  const [ansicht, setAnsicht] = useState<Ansicht>("arbeit");
  const [lernBereich, setLernBereich] = useState<LernBereich | null>(null);
  const [hintergrund, setHintergrundState] = useState<Hintergrund>(getHintergrund());

  useEffect(() => {
    document.body.dataset.hintergrund = hintergrund;
  }, [hintergrund]);

  useEffect(() => {
    let abgebrochen = false;
    setDatenZustand("laedt");
    ladeBestand()
      .then((bestand) => {
        if (abgebrochen) return;
        setSets(bestand.sets);
        setKarten(bestand.karten);
        setDatenZustand("bereit");
      })
      .catch(() => {
        if (!abgebrochen) setDatenZustand("fehler");
      });
    return () => {
      abgebrochen = true;
    };
  }, [ladeVersuch]);

  // Optimistisches Schreibmuster (wie "Ich koche"): State sofort ändern,
  // im Hintergrund persistieren, bei Fehler zurückrollen + ein Banner.
  async function optimistisch(
    anwenden: () => void,
    persistieren: () => Promise<unknown>,
    rollback: () => void,
  ): Promise<void> {
    anwenden();
    try {
      await persistieren();
    } catch {
      rollback();
      setFehlermeldung("Speichern fehlgeschlagen — bitte erneut versuchen.");
    }
  }

  function hintergrundWaehlen(wert: Hintergrund) {
    setHintergrundState(wert);
    speichereHintergrund(wert);
  }

  // --- Set-Aktionen ---------------------------------------------------

  function setErstellen(eingabe: SetEingabe, paare: KartePaar[]): KartenSet {
    const { set, karten: neueKarten } = baueNeuesSet(eingabe.name, paare);
    const vorherSets = sets;
    const vorherKarten = karten;
    optimistisch(
      () => {
        setSets((s) => [...s, set]);
        setKarten((k) => [...k, ...neueKarten]);
      },
      () => setBundleSpeichern(set, neueKarten),
      () => {
        setSets(vorherSets);
        setKarten(vorherKarten);
      },
    );
    return set;
  }

  function setAktualisieren(setId: string, updates: Partial<KartenSet>) {
    const vorher = sets;
    const neu = sets.map((s) => (s.id === setId ? { ...s, ...updates } : s));
    const geaendert = neu.find((s) => s.id === setId);
    if (!geaendert) return;
    optimistisch(
      () => setSets(neu),
      () => setSpeichern(geaendert),
      () => setSets(vorher),
    );
  }

  function setEntfernen(setId: string) {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    const vorherSets = sets;
    const vorherKarten = karten;
    optimistisch(
      () => {
        setSets((s) => s.filter((x) => x.id !== setId));
        setKarten((k) => k.filter((x) => x.setId !== setId));
      },
      () => setLoeschen(set, vorherKarten),
      () => {
        setSets(vorherSets);
        setKarten(vorherKarten);
      },
    );
  }

  // --- Karten-Aktionen --------------------------------------------

  function kartenImportieren(setId: string, paare: KartePaar[]) {
    if (paare.length === 0) return;
    const neueKarten = baueKarten(
      setId,
      karten.filter((k) => k.setId === setId),
      paare,
    );
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => [...k, ...neueKarten]),
      () => kartenSpeichern(neueKarten),
      () => setKarten(vorher),
    );
  }

  function karteErstellen(
    setId: string,
    daten: { vorderseite: string; rueckseite: string; bildBase64?: string },
  ): Karte {
    const jetzt = new Date().toISOString();
    const maxIndex = karten
      .filter((k) => k.setId === setId)
      .reduce((max, k) => Math.max(max, k.sortIndex ?? 0), 0);
    const karte: Karte = {
      id: crypto.randomUUID(),
      setId,
      sortIndex: maxIndex + 1,
      vorderseite: daten.vorderseite.trim(),
      rueckseite: daten.rueckseite.trim(),
      bildBase64: daten.bildBase64,
      gestartet: false,
      box: 1,
      naechsteWiederholung: jetzt.slice(0, 10),
      erstelltAm: jetzt,
    };
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => [...k, karte]),
      () => karteSpeichern(karte),
      () => setKarten(vorher),
    );
    return karte;
  }

  function karteAendern(
    karteId: string,
    updates: { vorderseite?: string; rueckseite?: string; bildBase64?: string | undefined },
  ) {
    const karte = karten.find((k) => k.id === karteId);
    if (!karte) return;
    const neueKarte: Karte = {
      ...karte,
      vorderseite: updates.vorderseite !== undefined ? updates.vorderseite.trim() : karte.vorderseite,
      rueckseite: updates.rueckseite !== undefined ? updates.rueckseite.trim() : karte.rueckseite,
      bildBase64: "bildBase64" in updates ? updates.bildBase64 : karte.bildBase64,
    };
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => k.map((x) => (x.id === karteId ? neueKarte : x))),
      () => karteSpeichern(neueKarte),
      () => setKarten(vorher),
    );
  }

  function karteEntfernen(karteId: string) {
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => k.filter((x) => x.id !== karteId)),
      () => karteLoeschen(karteId),
      () => setKarten(vorher),
    );
  }

  // Vorrats-Karten in Box 1 holen ("neue Wörter starten").
  function woerterStarten(karteIds: string[]) {
    if (karteIds.length === 0) return;
    const heute = heuteIso();
    const idSet = new Set(karteIds);
    const geaendert = karten.filter((k) => idSet.has(k.id)).map((k) => karteStarten(k, heute));
    const geaendertNachId = new Map(geaendert.map((k) => [k.id, k]));
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => k.map((x) => geaendertNachId.get(x.id) ?? x)),
      () => kartenSpeichern(geaendert),
      () => setKarten(vorher),
    );
  }

  // --- Lernrunde ---------------------------------------------------

  function lernAntwort(karteId: string, richtig: boolean) {
    const karte = karten.find((k) => k.id === karteId);
    if (!karte) return;
    const { box, naechsteWiederholung } = nachAntwort(karte, richtig);
    const neueKarte: Karte = { ...karte, box, naechsteWiederholung };
    const vorher = karten;
    optimistisch(
      () => setKarten((k) => k.map((x) => (x.id === karteId ? neueKarte : x))),
      () => karteSpeichern(neueKarte),
      () => setKarten(vorher),
    );
  }

  function lernenStarten(bereich: LernBereich) {
    setLernBereich(bereich);
    setAnsicht("lernen");
  }

  // --- Backup ----------------------------------------------------

  function backupUebernehmen(bestand: DatenBestand) {
    setSets(bestand.sets);
    setKarten(bestand.karten);
    setAnsicht("arbeit");
  }

  if (datenZustand !== "bereit") {
    return (
      <div className="app-shell">
        <Kopf />
        {datenZustand === "laedt" ? (
          <p className="note">Lädt deine Karten…</p>
        ) : (
          <div className="card accent-bordeaux">
            <p>Deine Daten konnten nicht geladen werden.</p>
            <div className="btn-row">
              <button className="btn" onClick={() => setLadeVersuch((v) => v + 1)}>
                Erneut versuchen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Kopf />

      {fehlermeldung && (
        <div style={{ marginBottom: "1.25rem" }}>
          <FehlerBanner meldung={fehlermeldung} onSchliessen={() => setFehlermeldung(null)} />
        </div>
      )}

      <nav className="nav">
        <button
          className={ansicht === "arbeit" || ansicht === "lernen" ? "active" : ""}
          onClick={() => setAnsicht("arbeit")}
        >
          Daran arbeite ich
        </button>
        <button className={ansicht === "bibliothek" ? "active" : ""} onClick={() => setAnsicht("bibliothek")}>
          Bibliothek
        </button>
      </nav>

      <div className="btn-row" style={{ justifyContent: "center", marginTop: "-0.25rem" }}>
        <button className="link-btn" onClick={() => setAnsicht("einstellungen")}>
          ⚙ Einstellungen
        </button>
      </div>

      <div className="ornament">
        <span className="dot" />
      </div>

      {ansicht === "arbeit" && (
        <DaranArbeiteIchRoute
          sets={sets}
          karten={karten}
          onLernen={lernenStarten}
          onZuBibliothek={() => setAnsicht("bibliothek")}
        />
      )}

      {ansicht === "bibliothek" && (
        <BibliothekRoute
          sets={sets}
          karten={karten}
          onSetErstellen={setErstellen}
          onSetAktualisieren={setAktualisieren}
          onSetLoeschen={setEntfernen}
          onKarteErstellen={karteErstellen}
          onKartenImportieren={kartenImportieren}
          onKarteAendern={karteAendern}
          onKarteLoeschen={karteEntfernen}
          onWoerterStarten={woerterStarten}
          onLernen={lernenStarten}
        />
      )}

      {ansicht === "lernen" && (
        <LernenRoute
          sets={sets}
          karten={karten}
          startBereich={lernBereich}
          onAntwort={lernAntwort}
          onFertig={() => setAnsicht("arbeit")}
        />
      )}

      {ansicht === "einstellungen" && (
        <EinstellungenRoute
          hintergrund={hintergrund}
          onHintergrund={hintergrundWaehlen}
          onExport={exportiereBackup}
          onImport={importiereBackup}
          onImportUebernommen={backupUebernehmen}
          onZurueck={() => setAnsicht("arbeit")}
        />
      )}
    </div>
  );
}

function Kopf() {
  return (
    <header className="brand-header">
      <div className="brand-name">Ich lerne</div>
      <div className="brand-sub">Karteikarten nach Leitner</div>
    </header>
  );
}

export default App;
