import { aktiveKarten, anzahlFaellig, gestarteteKarten } from "../leitner";
import type { Karte, KartenSet, LernBereich } from "../types";
import { BoxBalken } from "./BoxBalken";

interface Props {
  sets: KartenSet[];
  karten: Karte[];
  onLernen: (bereich: LernBereich) => void;
  onZuBibliothek: () => void;
}

export function DaranArbeiteIchRoute({ sets, karten, onLernen, onZuBibliothek }: Props) {
  const aktiveSets = sets.filter((s) => s.aktiv);
  const aktiveKartenListe = aktiveKarten(karten, sets);
  const faellig = anzahlFaellig(aktiveKartenListe);

  if (aktiveSets.length === 0) {
    return (
      <div className="empty-state">
        <p>Du arbeitest gerade an nichts.</p>
        <p className="note">
          {sets.length === 0
            ? "Leg in der Bibliothek ein Set an, hol ein paar Wörter ins Lernen und markiere das Set als „daran arbeite ich“."
            : "Öffne in der Bibliothek ein Set und tippe auf „Aktivieren“."}
        </p>
        <button className="btn" onClick={onZuBibliothek}>
          Zur Bibliothek
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card accent-bordeaux" style={{ textAlign: "center" }}>
        <div className="gross-zahl">{faellig}</div>
        <p className="note" style={{ marginTop: "0.35rem" }}>
          von {aktiveKartenListe.length} aktiven Karten {faellig === 1 ? "ist fällig" : "sind fällig"}
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button
            className="btn"
            disabled={aktiveKartenListe.length === 0}
            onClick={() => onLernen({ typ: "aktiv" })}
          >
            {faellig > 0 ? "Jetzt üben" : "Alles wiederholen"}
          </button>
        </div>
      </div>

      {aktiveKartenListe.length > 0 && (
        <div className="card">
          <BoxBalken karten={aktiveKartenListe} />
        </div>
      )}

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      {aktiveSets.map((set) => {
        const sKarten = karten.filter((k) => k.setId === set.id);
        const gestartet = gestarteteKarten(sKarten);
        return (
          <button
            className="listenzeile"
            key={set.id}
            onClick={() => onLernen({ typ: "set", setId: set.id })}
          >
            <div className="stapel" style={{ flex: 1 }}>
              <span className="listenzeile-titel">{set.name}</span>
              <span className="note" style={{ margin: 0 }}>
                {gestartet.length} im Lernen · {anzahlFaellig(sKarten)} fällig
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

      <p className="note" style={{ textAlign: "center" }}>
        Sets hinzufügen oder entfernen in der{" "}
        <button className="link-btn" onClick={onZuBibliothek}>
          Bibliothek
        </button>
        .
      </p>
    </div>
  );
}
