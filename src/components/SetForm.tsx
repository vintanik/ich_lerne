import { useState } from "react";
import type { KartePaar, SetEingabe } from "../types";
import { TextImportFeld } from "./TextImportFeld";

interface Props {
  onSpeichern: (eingabe: SetEingabe, paare: KartePaar[]) => void;
  onAbbrechen: () => void;
}

export function SetForm({ onSpeichern, onAbbrechen }: Props) {
  const [name, setName] = useState("");
  const [paare, setPaare] = useState<KartePaar[]>([]);

  const kannSpeichern = name.trim() !== "";

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!kannSpeichern) return;
    onSpeichern({ name: name.trim() }, paare);
  }

  return (
    <form onSubmit={absenden}>
      <div className="zurueck-zeile">
        <button type="button" className="btn secondary" onClick={onAbbrechen}>
          ← Abbrechen
        </button>
      </div>

      <h2>Neues Set</h2>

      <div className="field">
        <label htmlFor="set-name">Name</label>
        <input
          id="set-name"
          type="text"
          placeholder="z. B. Englisch C1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      <p className="note">
        Optional: Karten gleich mitbringen. Sie landen im Vorrat — im Set holst du sie dann
        portionsweise ins Lernen.
      </p>
      <TextImportFeld onChange={setPaare} />

      <div className="btn-row">
        <button type="submit" className="btn" disabled={!kannSpeichern}>
          Set anlegen{paare.length > 0 ? ` (${paare.length} Karten)` : ""}
        </button>
      </div>
    </form>
  );
}
