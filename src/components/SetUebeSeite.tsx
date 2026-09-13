import { useState } from "react";
import { ALLE_BOXEN, anzahlFaellig, boxVerteilung, gestarteteKarten, sortiereKarten, vorratKarten } from "../leitner";
import type { BoxNummer, Karte, KartenSet } from "../types";
import { BoxBalken } from "./BoxBalken";
import { ConfirmDialog } from "./ConfirmDialog";
import { NeueWoerterPanel } from "./NeueWoerterPanel";

interface Props {
  set: KartenSet;
  karten: Karte[];
  onZurueck: () => void;
  onUmbenennen: (name: string) => void;
  onLoeschen: () => void;
  onAktivSetzen: (aktiv: boolean) => void;
  onWoerterStarten: (karteIds: string[]) => void;
  onVerwalten: () => void;
  onLernen: () => void;
  onBoxUeben: (box: BoxNummer) => void;
}

export function SetUebeSeite({
  set,
  karten,
  onZurueck,
  onUmbenennen,
  onLoeschen,
  onAktivSetzen,
  onWoerterStarten,
  onVerwalten,
  onLernen,
  onBoxUeben,
}: Props) {
  const [nameBearbeiten, setNameBearbeiten] = useState(false);
  const [nameEntwurf, setNameEntwurf] = useState(set.name);
  const [zeigeLoeschen, setZeigeLoeschen] = useState(false);

  const gestartet = gestarteteKarten(karten);
  const vorrat = sortiereKarten(vorratKarten(karten));
  const faellig = anzahlFaellig(karten);
  const verteilung = boxVerteilung(karten);
  const belegteBoxen = ALLE_BOXEN.filter((b) => verteilung[b] > 0);

  return (
    <div>
      <div className="zurueck-zeile">
        <button className="btn secondary" onClick={onZurueck}>
          ← Ganze Bibliothek
        </button>
      </div>

      {nameBearbeiten ? (
        <div className="field">
          <label htmlFor="set-name-edit">Set-Name</label>
          <input
            id="set-name-edit"
            type="text"
            value={nameEntwurf}
            onChange={(e) => setNameEntwurf(e.target.value)}
            autoFocus
          />
          <div className="btn-row" style={{ marginTop: "0.5rem" }}>
            <button
              className="btn klein"
              onClick={() => {
                if (nameEntwurf.trim()) onUmbenennen(nameEntwurf.trim());
                setNameBearbeiten(false);
              }}
            >
              Speichern
            </button>
            <button
              className="btn secondary klein"
              onClick={() => {
                setNameEntwurf(set.name);
                setNameBearbeiten(false);
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="zeile-zwischen">
          <h2 style={{ margin: 0 }}>{set.name}</h2>
          <button className="link-btn" onClick={() => setNameBearbeiten(true)}>
            umbenennen
          </button>
        </div>
      )}

      <p className="note">
        {gestartet.length} im Lernen · {vorrat.length} im Vorrat · {faellig} fällig
      </p>

      {gestartet.length > 0 ? (
        <div className="card">
          <BoxBalken karten={gestartet} />
        </div>
      ) : (
        <p className="empty-state" style={{ padding: "1rem" }}>
          Noch nichts im Lernen — hol dir unten eine erste Portion.
        </p>
      )}

      <div className="btn-row">
        <button className="btn" disabled={gestartet.length === 0} onClick={onLernen}>
          {faellig > 0 ? `${faellig} fällige üben` : "Üben"}
        </button>
        <button className="btn secondary" onClick={onVerwalten}>
          Karten verwalten
        </button>
      </div>

      {belegteBoxen.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <strong>Einzelne Box üben</strong>
          <p className="note" style={{ margin: "0.2rem 0 0.6rem" }}>
            Unabhängig von der Fälligkeit — für gezieltes Wiederholen.
          </p>
          <div className="tag-row" style={{ marginBottom: 0 }}>
            {belegteBoxen.map((b) => (
              <button key={b} className="tag salbei" onClick={() => onBoxUeben(b)}>
                Box {b} ({verteilung[b]})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      <NeueWoerterPanel vorrat={vorrat} onStarten={onWoerterStarten} />

      <div className="card">
        <div className="zeile-zwischen">
          <div style={{ flex: 1 }}>
            <strong>Daran arbeite ich</strong>
            <p className="note" style={{ margin: 0 }}>
              {set.aktiv
                ? "Dieses Set erscheint im Trainer-Bereich."
                : "Aktivieren, damit dieses Set im Trainer-Bereich auftaucht."}
            </p>
          </div>
          <button
            className={`btn klein${set.aktiv ? " salbei secondary" : " salbei"}`}
            onClick={() => onAktivSetzen(!set.aktiv)}
          >
            {set.aktiv ? "Entfernen" : "Aktivieren"}
          </button>
        </div>
      </div>

      <div className="ornament">
        <span className="dot" />
      </div>

      {zeigeLoeschen ? (
        <ConfirmDialog
          frage={`Set „${set.name}“ mit allen ${karten.length} Karten löschen? Das kann nicht rückgängig gemacht werden.`}
          bestaetigenText="Ja, Set löschen"
          onBestaetigen={onLoeschen}
          onAbbrechen={() => setZeigeLoeschen(false)}
        />
      ) : (
        <button className="btn secondary" onClick={() => setZeigeLoeschen(true)}>
          Set löschen
        </button>
      )}
    </div>
  );
}
