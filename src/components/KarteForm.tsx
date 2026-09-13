import { useState } from "react";
import type { Karte } from "../types";
import { BildFeld } from "./BildFeld";

export interface KarteFormDaten {
  vorderseite: string;
  rueckseite: string;
  bildBase64: string | undefined;
}

interface Props {
  bestehendeKarte?: Karte;
  onSpeichern: (daten: KarteFormDaten) => void;
  onAbbrechen: () => void;
}

export function KarteForm({ bestehendeKarte, onSpeichern, onAbbrechen }: Props) {
  const [vorderseite, setVorderseite] = useState(bestehendeKarte?.vorderseite ?? "");
  const [rueckseite, setRueckseite] = useState(bestehendeKarte?.rueckseite ?? "");
  const [bildBase64, setBildBase64] = useState<string | undefined>(bestehendeKarte?.bildBase64);

  const kannSpeichern = vorderseite.trim() !== "" && rueckseite.trim() !== "";

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!kannSpeichern) return;
    onSpeichern({ vorderseite, rueckseite, bildBase64 });
  }

  return (
    <form onSubmit={absenden}>
      <div className="zurueck-zeile">
        <button type="button" className="btn secondary" onClick={onAbbrechen}>
          ← Abbrechen
        </button>
      </div>

      <h2>{bestehendeKarte ? "Karte bearbeiten" : "Neue Karte"}</h2>

      <div className="field">
        <label htmlFor="karte-vs">Vorderseite</label>
        <textarea id="karte-vs" rows={2} value={vorderseite} onChange={(e) => setVorderseite(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label htmlFor="karte-rs">Rückseite</label>
        <textarea id="karte-rs" rows={2} value={rueckseite} onChange={(e) => setRueckseite(e.target.value)} />
      </div>

      <BildFeld bildBase64={bildBase64} onChange={setBildBase64} />

      {!bestehendeKarte && <p className="note">Neue Karten landen im Vorrat.</p>}

      <div className="btn-row">
        <button type="submit" className="btn" disabled={!kannSpeichern}>
          Speichern
        </button>
      </div>
    </form>
  );
}
