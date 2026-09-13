import { useMemo, useState } from "react";
import { parseImport, TRENNER_OPTIONEN, type TrennerModus } from "../textimport";
import type { KartePaar } from "../types";

interface Props {
  /** wird bei jeder Eingabe mit dem aktuellen Parse-Ergebnis aufgerufen */
  onChange: (paare: KartePaar[]) => void;
  label?: string;
}

export function TextImportFeld({ onChange, label = "Karten aus Text (eine pro Zeile)" }: Props) {
  const [text, setText] = useState("");
  const [modus, setModus] = useState<TrennerModus>("auto");

  const ergebnis = useMemo(() => parseImport(text, modus), [text, modus]);

  function aktualisieren(neuerText: string, neuerModus: TrennerModus) {
    setText(neuerText);
    setModus(neuerModus);
    onChange(parseImport(neuerText, neuerModus).paare);
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="import-text">{label}</label>
        <textarea
          id="import-text"
          rows={6}
          placeholder={"Katze — chat\nHund — chien\nVogel — oiseau"}
          value={text}
          onChange={(e) => aktualisieren(e.target.value, modus)}
        />
      </div>

      <div className="field">
        <label htmlFor="import-trenner">Trennzeichen</label>
        <select
          id="import-trenner"
          value={modus}
          onChange={(e) => aktualisieren(text, e.target.value as TrennerModus)}
        >
          {TRENNER_OPTIONEN.map((o) => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {text.trim() !== "" && (
        <div className="field">
          <p className="note" style={{ marginBottom: "0.4rem" }}>
            {ergebnis.paare.length} {ergebnis.paare.length === 1 ? "Karte" : "Karten"} erkannt
            {ergebnis.uebersprungen.length > 0 &&
              ` · ${ergebnis.uebersprungen.length} Zeile(n) ohne Trennzeichen übersprungen`}
          </p>
          {ergebnis.paare.length > 0 && (
            <div className="import-vorschau">
              {ergebnis.paare.slice(0, 30).map((p, i) => (
                <div className="import-vorschau-zeile" key={i}>
                  <span className="import-vorschau-vs">{p.vorderseite}</span>
                  <span className="import-vorschau-rs">{p.rueckseite}</span>
                </div>
              ))}
              {ergebnis.paare.length > 30 && (
                <div className="import-vorschau-zeile">
                  <span className="note">… und {ergebnis.paare.length - 30} weitere</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
