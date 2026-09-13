import { useState } from "react";
import { STANDARD_PORTION } from "../leitner";
import type { Karte } from "../types";

interface Props {
  /** Vorrats-Karten des Sets, bereits in Lern-Reihenfolge sortiert. */
  vorrat: Karte[];
  onStarten: (karteIds: string[]) => void;
}

export function NeueWoerterPanel({ vorrat, onStarten }: Props) {
  const [modus, setModus] = useState<"anzahl" | "auswahl">("anzahl");
  const [anzahl, setAnzahl] = useState(Math.min(STANDARD_PORTION, vorrat.length || STANDARD_PORTION));
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(new Set());

  if (vorrat.length === 0) {
    return (
      <div className="card accent-salbei">
        <strong>Vorrat leer</strong>
        <p className="note" style={{ margin: 0 }}>
          Alle Wörter dieses Sets sind im Lernen. Füge über „Karten verwalten“ neue hinzu.
        </p>
      </div>
    );
  }

  const sichereAnzahl = Math.max(1, Math.min(anzahl || 1, vorrat.length));

  function umschalten(id: string) {
    setAusgewaehlt((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });
  }

  return (
    <div className="card accent-salbei">
      <div className="zeile-zwischen">
        <strong>Neue Wörter ins Lernen holen</strong>
        <span className="note" style={{ margin: 0 }}>
          {vorrat.length} im Vorrat
        </span>
      </div>

      {modus === "anzahl" ? (
        <>
          <div className="field" style={{ marginTop: "0.75rem", marginBottom: "0.75rem" }}>
            <label htmlFor="portion-anzahl">Wie viele?</label>
            <input
              id="portion-anzahl"
              type="number"
              min={1}
              max={vorrat.length}
              value={anzahl}
              onChange={(e) => setAnzahl(Number(e.target.value))}
              style={{ maxWidth: "8rem" }}
            />
          </div>
          <div className="btn-row">
            <button
              className="btn salbei"
              onClick={() => onStarten(vorrat.slice(0, sichereAnzahl).map((k) => k.id))}
            >
              {sichereAnzahl === 1 ? "Nächstes Wort starten" : `Nächste ${sichereAnzahl} Wörter starten`}
            </button>
            <button className="link-btn" onClick={() => setModus("auswahl")}>
              gezielt auswählen
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="note" style={{ marginTop: "0.75rem" }}>
            {ausgewaehlt.size} ausgewählt
          </p>
          <div className="import-vorschau" style={{ maxHeight: "260px" }}>
            {vorrat.map((k) => (
              <label
                key={k.id}
                className="import-vorschau-zeile"
                style={{ cursor: "pointer", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={ausgewaehlt.has(k.id)}
                  onChange={() => umschalten(k.id)}
                  style={{ marginRight: "0.5rem", flexShrink: 0 }}
                />
                <span className="import-vorschau-vs">{k.vorderseite}</span>
                <span className="import-vorschau-rs">{k.rueckseite}</span>
              </label>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: "0.75rem" }}>
            <button
              className="btn salbei"
              disabled={ausgewaehlt.size === 0}
              onClick={() => onStarten([...ausgewaehlt])}
            >
              {ausgewaehlt.size} ausgewählte starten
            </button>
            <button
              className="link-btn"
              onClick={() => {
                setModus("anzahl");
                setAusgewaehlt(new Set());
              }}
            >
              zurück
            </button>
          </div>
        </>
      )}
    </div>
  );
}
