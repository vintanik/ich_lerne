import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { holeGeteiltenOrdner, holeGeteiltesSet } from "../sharing";
import type { GeteilterOrdnerKnoten, GeteiltesSet } from "../types";
import { LoginScreen } from "./LoginScreen";

type Zustand =
  | { typ: "laedt" }
  | { typ: "gefunden"; set: GeteiltesSet }
  | { typ: "gefunden-ordner"; knoten: GeteilterOrdnerKnoten }
  | { typ: "nicht-gefunden" }
  | { typ: "fehler" };

interface Props {
  geteiltTyp: "set" | "ordner";
  token: string;
  session: Session | null;
  onSetUebernehmen: (set: GeteiltesSet) => void;
  onOrdnerUebernehmen: (knoten: GeteilterOrdnerKnoten) => Promise<void>;
}

function zaehleKartenImOrdner(knoten: GeteilterOrdnerKnoten): number {
  return (
    knoten.sets.reduce((summe, s) => summe + s.karten.length, 0) +
    knoten.unterordner.reduce((summe, k) => summe + zaehleKartenImOrdner(k), 0)
  );
}

function OrdnerVorschau({ knoten, tiefe = 0 }: { knoten: GeteilterOrdnerKnoten; tiefe?: number }) {
  return (
    <div style={{ marginLeft: tiefe > 0 ? "1rem" : 0 }}>
      {tiefe > 0 && (
        <p className="listenzeile-titel" style={{ margin: "0.6rem 0 0.2rem" }}>
          📁 {knoten.name}
        </p>
      )}
      {knoten.sets.map((s) => (
        <p className="note" key={s.name} style={{ margin: "0.15rem 0" }}>
          {s.name} — {s.karten.length} {s.karten.length === 1 ? "Karte" : "Karten"}
        </p>
      ))}
      {knoten.unterordner.map((k) => (
        <OrdnerVorschau knoten={k} tiefe={tiefe + 1} key={k.name} />
      ))}
    </div>
  );
}

/** Öffentliche, login-freie Ansicht eines Freigabe-Links (/geteilt/set/... oder /geteilt/ordner/...). */
export function SharedRoute({ geteiltTyp, token, session, onSetUebernehmen, onOrdnerUebernehmen }: Props) {
  const [zustand, setZustand] = useState<Zustand>({ typ: "laedt" });
  const [uebernommen, setUebernommen] = useState(false);
  const [uebernahmeLaeuft, setUebernahmeLaeuft] = useState(false);
  const [uebernahmeFehler, setUebernahmeFehler] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    const anfrage = geteiltTyp === "set" ? holeGeteiltesSet(token) : holeGeteiltenOrdner(token);
    anfrage
      .then((daten) => {
        if (abgebrochen) return;
        if (!daten) {
          setZustand({ typ: "nicht-gefunden" });
        } else if (geteiltTyp === "set") {
          setZustand({ typ: "gefunden", set: daten as GeteiltesSet });
        } else {
          setZustand({ typ: "gefunden-ordner", knoten: daten as GeteilterOrdnerKnoten });
        }
      })
      .catch(() => {
        if (!abgebrochen) setZustand({ typ: "fehler" });
      });
    return () => {
      abgebrochen = true;
    };
  }, [geteiltTyp, token]);

  async function uebernehmen() {
    setUebernahmeFehler(false);
    setUebernahmeLaeuft(true);
    try {
      if (zustand.typ === "gefunden") {
        onSetUebernehmen(zustand.set);
      } else if (zustand.typ === "gefunden-ordner") {
        await onOrdnerUebernehmen(zustand.knoten);
      } else {
        return;
      }
      setUebernommen(true);
    } catch {
      setUebernahmeFehler(true);
    } finally {
      setUebernahmeLaeuft(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="brand-header">
        <div className="brand-name">Ich lerne</div>
        <div className="brand-sub">Karteikarten nach Leitner</div>
      </header>

      <div className="ornament">
        <span className="dot" />
      </div>

      {zustand.typ === "laedt" && <p className="note">Lädt…</p>}

      {(zustand.typ === "nicht-gefunden" || zustand.typ === "fehler") && (
        <p className="empty-state">Dieser Link ist nicht (mehr) verfügbar.</p>
      )}

      {(zustand.typ === "gefunden" || zustand.typ === "gefunden-ordner") && (
        <>
          <div className="card accent-bordeaux">
            {zustand.typ === "gefunden" ? (
              <>
                <h2>{zustand.set.name}</h2>
                <p className="note">
                  {zustand.set.karten.length} {zustand.set.karten.length === 1 ? "Karte" : "Karten"}
                </p>
                <div className="stapel">
                  {zustand.set.karten.map((k, i) => (
                    <p className="note" key={i} style={{ margin: 0 }}>
                      {k.vorderseite} — {k.rueckseite}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2>📁 {zustand.knoten.name}</h2>
                <p className="note">{zaehleKartenImOrdner(zustand.knoten)} Karten insgesamt</p>
                <OrdnerVorschau knoten={zustand.knoten} />
              </>
            )}
          </div>

          <div className="card accent-salbei" style={{ marginTop: "1.25rem" }}>
            {uebernommen ? (
              <>
                <h3>In deiner Bibliothek gespeichert</h3>
                <div className="btn-row">
                  <button className="btn" onClick={() => (window.location.href = "/")}>
                    Zur Bibliothek
                  </button>
                </div>
              </>
            ) : session ? (
              <>
                <h3>{zustand.typ === "gefunden" ? "Dieses Set" : "Diesen Ordner"} übernehmen?</h3>
                <p className="note">Landet als eigenständige Kopie in deiner Bibliothek — mit frischem Fortschritt.</p>
                <div className="btn-row">
                  <button className="btn" onClick={uebernehmen} disabled={uebernahmeLaeuft}>
                    {uebernahmeLaeuft ? "Übernimmt…" : "In meine Bibliothek übernehmen"}
                  </button>
                </div>
                {uebernahmeFehler && <p className="note">Übernahme fehlgeschlagen — bitte erneut versuchen.</p>}
              </>
            ) : (
              <>
                <h3>Konto nötig zum Übernehmen</h3>
                <p className="note">Hast du schon eins, wechsle oben einfach auf „Anmelden“.</p>
                <LoginScreen initialModus="registrieren" eingebettet />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
