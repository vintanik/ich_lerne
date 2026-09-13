import { useState } from "react";
import { ALLE_BOXEN, boxVerteilung } from "../leitner";
import type { BoxNummer, Karte } from "../types";

export interface Bewertung {
  karte: Karte;
  richtig: boolean;
}

interface Props {
  /** Karten dieser Runde (bereits gemischt). */
  karten: Karte[];
  /** Ganzer Lernbereich — Grundlage für die Fortschrittsleiste oben. */
  scopeKarten: Karte[];
  /** z. B. "Französisch Lektion 3 / Karten 1–15". */
  scopeLabel: string;
  /** Bei gezieltem Box-Üben: welche Box hervorgehoben werden soll. */
  aktiveBox?: BoxNummer;
  /** pro Karte sofort, für die optimistische Box-Aktualisierung */
  onBewertung: (karte: Karte, richtig: boolean) => void;
  /** am Ende, mit allen Bewertungen der Runde */
  onKomplett: (bewertungen: Bewertung[]) => void;
  onAbbrechen: () => void;
}

const BOX_FARBE: Record<BoxNummer, string> = {
  1: "var(--box-1)",
  2: "var(--box-2)",
  3: "var(--box-3)",
  4: "var(--box-4)",
  5: "var(--box-5)",
};

// Textfarbe auf voll eingefärbtem Box-Hintergrund — je nach Helligkeit der
// jeweiligen Box-Farbe hell oder dunkel, damit es lesbar bleibt.
const BOX_TEXT_AUF_FARBE: Record<BoxNummer, string> = {
  1: "var(--paper-light)",
  2: "var(--paper-light)",
  3: "var(--border-dark)",
  4: "var(--border-dark)",
  5: "var(--paper-light)",
};

export function LernModus({ karten, scopeKarten, scopeLabel, aktiveBox, onBewertung, onKomplett, onAbbrechen }: Props) {
  const gesamt = karten.length;
  const [queue, setQueue] = useState<Karte[]>(karten);
  const [erledigt, setErledigt] = useState(0);
  const [gedreht, setGedreht] = useState(false);
  const [bewertungen, setBewertungen] = useState<Bewertung[]>([]);

  const aktuelle = queue[0];
  const verteilung = boxVerteilung(scopeKarten);
  const scopeGesamt = scopeKarten.length;

  function bewerten(richtig: boolean) {
    const naechste = [...bewertungen, { karte: aktuelle, richtig }];
    setBewertungen(naechste);
    onBewertung(aktuelle, richtig);
    const rest = queue.slice(1);
    setGedreht(false);
    if (rest.length === 0) {
      onKomplett(naechste);
    } else {
      setQueue(rest);
      setErledigt((e) => e + 1);
    }
  }

  function ueberspringen() {
    if (queue.length <= 1) return;
    setQueue([...queue.slice(1), queue[0]]);
    setGedreht(false);
  }

  return (
    <div>
      {/* Fortschrittsleiste über die 5 Leitner-Boxen */}
      <div className="trainer-leiste">
        {ALLE_BOXEN.map((b) => {
          const anteil = scopeGesamt > 0 ? (verteilung[b] / scopeGesamt) * 100 : 0;
          const istAktiv = b === aktiveBox;
          return (
            <div
              className={`trainer-leiste-seg${istAktiv ? " aktiv" : ""}`}
              key={b}
              style={{
                borderTopColor: BOX_FARBE[b],
                background: istAktiv ? BOX_FARBE[b] : undefined,
                color: istAktiv ? BOX_TEXT_AUF_FARBE[b] : undefined,
              }}
            >
              <span className="trainer-leiste-label">Box {b}</span>
              <span className="trainer-leiste-zahl">{verteilung[b]}</span>
              {!istAktiv && (
                <span className="trainer-leiste-anteil" aria-hidden>
                  <span style={{ width: `${anteil}%`, background: BOX_FARBE[b] }} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="zurueck-zeile">
        <button className="btn secondary klein" onClick={onAbbrechen}>
          ← Lernrunde abbrechen
        </button>
      </div>

      <div className="trainer-karte">
        <div className="trainer-scope">{scopeLabel}</div>

        <p className="lern-fortschritt note">
          Karte {Math.min(erledigt + 1, gesamt)} von {gesamt}
        </p>

        <div
          className={`lern-karte${gedreht ? " rueckseite" : ""}`}
          onClick={() => !gedreht && setGedreht(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !gedreht) {
              e.preventDefault();
              setGedreht(true);
            }
          }}
        >
          <span className="lern-karte-seiten-label">{gedreht ? "Rückseite" : "Vorderseite"}</span>
          <span className="lern-karte-text">{gedreht ? aktuelle.rueckseite : aktuelle.vorderseite}</span>
          {aktuelle.bildBase64 && <img className="lern-karte-bild" src={aktuelle.bildBase64} alt="" />}
          {!gedreht && <span className="lern-karte-hinweis">Tippen zum Umdrehen</span>}
        </div>

        {gedreht ? (
          <div className="bewertung-row">
            <button className="btn secondary" onClick={() => bewerten(false)}>
              Falsch
            </button>
            <button className="btn salbei" onClick={() => bewerten(true)}>
              Richtig
            </button>
          </div>
        ) : (
          <div className="trainer-fuss">
            <button className="btn secondary klein" onClick={ueberspringen} disabled={queue.length <= 1}>
              überspringen
            </button>
            <button className="btn" onClick={() => setGedreht(true)}>
              Lösung zeigen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
