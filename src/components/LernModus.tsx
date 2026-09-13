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

export function LernModus({ karten, scopeKarten, scopeLabel, onBewertung, onKomplett, onAbbrechen }: Props) {
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
          return (
            <div className="trainer-leiste-seg" key={b} style={{ borderTopColor: BOX_FARBE[b] }}>
              <span className="trainer-leiste-label">Box {b}</span>
              <span className="trainer-leiste-zahl">{verteilung[b]}</span>
              <span className="trainer-leiste-anteil" aria-hidden>
                <span style={{ width: `${anteil}%`, background: BOX_FARBE[b] }} />
              </span>
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
