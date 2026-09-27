import { useEffect, useState } from "react";
import { usePasswortWiederherstellung } from "./auth/usePasswortWiederherstellung";
import { useSession } from "./auth/useSession";
import { hatLokaleDaten } from "./cloudMigration";
import { baueKarten, baueNeuesSet, heuteIso, karteStarten, nachAntwort } from "./leitner";
import { baueOrdner } from "./ordner";
import {
  einstellungenSpeichern,
  exportiereBackup,
  getHintergrund,
  importiereBackup,
  karteLoeschen,
  karteSpeichern,
  kartenSpeichern,
  ladeBestand,
  ladeEinstellungen,
  ordnerErstellen as ordnerInsertieren,
  ordnerLoeschen as ordnerEntfernenSpeichern,
  ordnerSpeichern,
  setBundleSpeichern,
  setHintergrund as speichereHintergrund,
  setLoeschen,
  setMigrationAngeboten,
  setSpeichern,
  wurdeMigrationAngeboten,
  type Hintergrund,
} from "./storage";
import type { DatenBestand, Karte, KartePaar, KartenSet, LernBereich, Ordner, OrdnerEingabe, SetEingabe } from "./types";
import { BibliothekRoute } from "./components/BibliothekRoute";
import { EinstellungenRoute } from "./components/EinstellungenRoute";
import { FehlerBanner } from "./components/FehlerBanner";
import { LernenRoute } from "./components/LernenRoute";
import { LoginScreen } from "./components/LoginScreen";
import { MigrationAngebot } from "./components/MigrationAngebot";
import { PasswortZuruecksetzenScreen } from "./components/PasswortZuruecksetzenScreen";

type Ansicht = "bibliothek" | "lernen" | "einstellungen";

function App() {
  const { session, laedt } = useSession();
  // Siehe "Ich koche": onAuthStateChange liefert beim Tab-Wechsel auch für
  // dieselbe Person ein neues Session-Objekt (blosser Token-Refresh) — die
  // Lade-Gate-Effekte hängen deshalb bewusst an dieser stabilen id statt am
  // ganzen session-Objekt.
  const userId = session?.user.id;
  const { istWiederherstellung, abschliessen: wiederherstellungAbschliessen } = usePasswortWiederherstellung();

  const [sets, setSets] = useState<KartenSet[]>([]);
  const [karten, setKarten] = useState<Karte[]>([]);
  const [ordner, setOrdner] = useState<Ordner[]>([]);
  const [datenZustand, setDatenZustand] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const [ladeVersuch, setLadeVersuch] = useState(0);
  const [fehlermeldung, setFehlermeldung] = useState<string | null>(null);
  const [zeigeMigrationsAngebot, setZeigeMigrationsAngebot] = useState(false);

  const [ansicht, setAnsicht] = useState<Ansicht>("bibliothek");
  const [lernBereich, setLernBereich] = useState<LernBereich | null>(null);
  const [hintergrund, setHintergrundState] = useState<Hintergrund>(getHintergrund());
  const [karteFaelltZurueck, setKarteFaelltZurueckState] = useState(true);

  useEffect(() => {
    document.body.dataset.hintergrund = hintergrund;
  }, [hintergrund]);

  // Gemeinsames Lade-Gate direkt nach dem Login — solange es läuft, rendert
  // die eigentliche App noch nicht.
  useEffect(() => {
    if (!userId) return;
    let abgebrochen = false;
    setDatenZustand("laedt");
    ladeBestand()
      .then((bestand) => {
        if (abgebrochen) return;
        setSets(bestand.sets);
        setKarten(bestand.karten);
        setOrdner(bestand.ordner);
        setDatenZustand("bereit");
      })
      .catch(() => {
        if (!abgebrochen) setDatenZustand("fehler");
      });
    return () => {
      abgebrochen = true;
    };
  }, [userId, ladeVersuch]);

  // Separat vom Lade-Gate: eine fehlende/fehlgeschlagene Einstellungs-Zeile
  // (z. B. Migration 0003 noch nicht ausgeführt) soll niemals die ganze App
  // blockieren — bei Fehler bleibt einfach der Standard (Box fällt zurück).
  useEffect(() => {
    if (!userId) return;
    let abgebrochen = false;
    ladeEinstellungen()
      .then((wert) => {
        if (!abgebrochen) setKarteFaelltZurueckState(wert);
      })
      .catch(() => {});
    return () => {
      abgebrochen = true;
    };
  }, [userId]);

  // Einmalig pro Browser prüfen, ob lokale IndexedDB-Altdaten (von vor der
  // Cloud-Umstellung) übernommen werden sollen.
  useEffect(() => {
    if (!userId) return;
    if (wurdeMigrationAngeboten()) return;
    let abgebrochen = false;
    hatLokaleDaten().then((hat) => {
      if (abgebrochen) return;
      if (hat) setZeigeMigrationsAngebot(true);
      else setMigrationAngeboten();
    });
    return () => {
      abgebrochen = true;
    };
  }, [userId]);

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

  function karteFaelltZurueckAendern(wert: boolean) {
    const vorher = karteFaelltZurueck;
    optimistisch(
      () => setKarteFaelltZurueckState(wert),
      () => einstellungenSpeichern(wert),
      () => setKarteFaelltZurueckState(vorher),
    );
  }

  // --- Set-Aktionen ---------------------------------------------------

  function setErstellen(eingabe: SetEingabe, paare: KartePaar[], ordnerId: string | null = null): KartenSet {
    const { set, karten: neueKarten } = baueNeuesSet(eingabe.name, paare, ordnerId);
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
      () => setLoeschen(set),
      () => {
        setSets(vorherSets);
        setKarten(vorherKarten);
      },
    );
  }

  // --- Ordner-Aktionen ------------------------------------------

  function ordnerAnlegen(eingabe: OrdnerEingabe): Ordner {
    const neu = baueOrdner(eingabe.name, eingabe.parentId);
    const vorher = ordner;
    optimistisch(
      () => setOrdner((o) => [...o, neu]),
      () => ordnerInsertieren(neu),
      () => setOrdner(vorher),
    );
    return neu;
  }

  function ordnerUmbenennen(ordnerId: string, name: string) {
    const vorher = ordner;
    const neu = ordner.map((o) => (o.id === ordnerId ? { ...o, name } : o));
    const geaendert = neu.find((o) => o.id === ordnerId);
    if (!geaendert) return;
    optimistisch(
      () => setOrdner(neu),
      () => ordnerSpeichern(geaendert),
      () => setOrdner(vorher),
    );
  }

  // Unter-Ordner/Sets rutschen eine Ebene hoch statt gelöscht zu werden —
  // muss hier im optimistischen Update dieselbe Umsortierung nachbilden wie
  // die "on delete set null"-Regel in der Datenbank (siehe 0002_ordner.sql),
  // sonst zeigt der lokale State bis zum nächsten Neuladen tote Referenzen.
  function ordnerEntfernen(ordnerId: string) {
    const geloeschter = ordner.find((o) => o.id === ordnerId);
    if (!geloeschter) return;
    const vorherOrdner = ordner;
    const vorherSets = sets;
    optimistisch(
      () => {
        setOrdner((o) =>
          o.filter((x) => x.id !== ordnerId).map((x) => (x.parentId === ordnerId ? { ...x, parentId: null } : x)),
        );
        setSets((s) => s.map((x) => (x.ordnerId === ordnerId ? { ...x, ordnerId: null } : x)));
      },
      () => ordnerEntfernenSpeichern(ordnerId),
      () => {
        setOrdner(vorherOrdner);
        setSets(vorherSets);
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
    const { box, naechsteWiederholung } = nachAntwort(karte, richtig, karteFaelltZurueck);
    const neueKarte: Karte = { ...karte, box, naechsteWiederholung };
    const vorherKarte = karte;
    optimistisch(
      () => setKarten((k) => k.map((x) => (x.id === karteId ? neueKarte : x))),
      () => karteSpeichern(neueKarte),
      () => setKarten((k) => k.map((x) => (x.id === karteId ? vorherKarte : x))),
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
    setOrdner(bestand.ordner);
    setAnsicht("bibliothek");
  }

  // Kurzer Ladezustand beim Start, bis eine evtl. vorhandene Sitzung geprüft
  // ist — verhindert ein Aufblitzen des Login-Screens für angemeldete Leute.
  if (laedt) {
    return (
      <div className="app-shell">
        <Kopf />
        <p className="note">Lädt…</p>
      </div>
    );
  }

  if (istWiederherstellung) {
    return <PasswortZuruecksetzenScreen onFertig={wiederherstellungAbschliessen} />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (datenZustand !== "bereit") {
    return (
      <div className="app-shell">
        <Kopf />
        {datenZustand === "laedt" ? (
          <p className="note">Lädt deine Karten…</p>
        ) : (
          <div className="card accent-bordeaux">
            <p>Deine Daten konnten nicht geladen werden — vielleicht keine Internetverbindung?</p>
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

      {zeigeMigrationsAngebot && (
        <MigrationAngebot
          userId={session.user.id}
          onFertig={() => {
            setZeigeMigrationsAngebot(false);
            setLadeVersuch((v) => v + 1);
          }}
        />
      )}

      <div className="btn-row" style={{ justifyContent: "center" }}>
        <button className="link-btn" onClick={() => setAnsicht("einstellungen")}>
          ⚙ Einstellungen
        </button>
      </div>

      <div className="ornament">
        <span className="dot" />
      </div>

      {ansicht === "bibliothek" && (
        <BibliothekRoute
          sets={sets}
          karten={karten}
          ordner={ordner}
          onSetErstellen={setErstellen}
          onSetAktualisieren={setAktualisieren}
          onSetLoeschen={setEntfernen}
          onOrdnerErstellen={ordnerAnlegen}
          onOrdnerUmbenennen={ordnerUmbenennen}
          onOrdnerLoeschen={ordnerEntfernen}
          onKarteErstellen={karteErstellen}
          onKartenImportieren={kartenImportieren}
          onKarteAendern={karteAendern}
          onKarteLoeschen={karteEntfernen}
          onWoerterStarten={woerterStarten}
          onLernen={lernenStarten}
        />
      )}

      {ansicht === "lernen" && lernBereich && (
        <LernenRoute
          sets={sets}
          karten={karten}
          startBereich={lernBereich}
          karteFaelltZurueck={karteFaelltZurueck}
          onAntwort={lernAntwort}
          onFertig={() => setAnsicht("bibliothek")}
        />
      )}

      {ansicht === "einstellungen" && (
        <EinstellungenRoute
          hintergrund={hintergrund}
          onHintergrund={hintergrundWaehlen}
          karteFaelltZurueck={karteFaelltZurueck}
          onKarteFaelltZurueck={karteFaelltZurueckAendern}
          onExport={exportiereBackup}
          onImport={importiereBackup}
          onImportUebernommen={backupUebernehmen}
          onZurueck={() => setAnsicht("bibliothek")}
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
