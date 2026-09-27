import { useState } from "react";
import { ALLE_BOXEN, BOX_INTERVALL_LABEL } from "../leitner";
import type { BoxNummer } from "../types";

const BOX_FARBE: Record<BoxNummer, string> = {
  1: "var(--box-1)",
  2: "var(--box-2)",
  3: "var(--box-3)",
  4: "var(--box-4)",
  5: "var(--box-5)",
};

interface Props {
  onSchliessen: (nichtMehrZeigen: boolean) => void;
}

export function IntroScreen({ onSchliessen }: Props) {
  const [nichtMehrZeigen, setNichtMehrZeigen] = useState(false);

  return (
    <div className="app-shell">
      <header className="brand-header">
        <div className="brand-name">Ich lerne</div>
        <div className="brand-sub">Karteikarten nach Leitner</div>
      </header>

      <div className="ornament">
        <span className="dot" />
      </div>

      <div className="card accent-bordeaux">
        <h2>Kurz erklärt</h2>
        <p>
          Neue Karten landen erst im <strong>Vorrat</strong> — du holst dir portionsweise eine Auswahl davon ins
          Lernen. Jede gelernte Karte steht danach in einer von 5 Boxen:
        </p>

        <div className="stapel" style={{ margin: "0.9rem 0" }}>
          {ALLE_BOXEN.map((b) => (
            <div key={b} className="zeile-zwischen" style={{ gap: "0.6rem" }}>
              <span
                aria-hidden
                style={{
                  width: "0.85rem",
                  height: "0.85rem",
                  borderRadius: "3px",
                  background: BOX_FARBE[b],
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>Box {b}</span>
              <span className="note" style={{ margin: 0 }}>
                {BOX_INTERVALL_LABEL[b]}
              </span>
            </div>
          ))}
        </div>

        <p>
          <strong>Richtig</strong> beantwortet → eine Box weiter (seltener dran). <strong>Falsch</strong> → eine Box
          zurück (öfter dran) — beides lässt sich in den Einstellungen anpassen.
        </p>
        <p>
          Eine Karte ist <strong>fällig</strong>, sobald ihr Box-Intervall abgelaufen ist. Willst du gezielt eine
          bestimmte Box wiederholen statt nur die fälligen Karten, geht das jederzeit über „Einzelne Box üben“.
        </p>
      </div>

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      <label style={{ display: "flex", alignItems: "center", textTransform: "none", letterSpacing: 0, color: "var(--text)", fontWeight: 400 }}>
        <input
          type="checkbox"
          checked={nichtMehrZeigen}
          onChange={(e) => setNichtMehrZeigen(e.target.checked)}
          style={{ marginRight: "0.5rem" }}
        />
        Nicht mehr anzeigen
      </label>

      <div className="btn-row" style={{ marginTop: "0.75rem" }}>
        <button className="btn" onClick={() => onSchliessen(nichtMehrZeigen)}>
          Los geht's
        </button>
      </div>
    </div>
  );
}
