import { useState } from "react";
import { istGestartet, sortiereKarten } from "../leitner";
import type { Karte, KartePaar, KartenSet } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { TextImportFeld } from "./TextImportFeld";

interface Props {
  set: KartenSet;
  karten: Karte[];
  onZurueck: () => void;
  onNeueKarte: () => void;
  onKarteBearbeiten: (karteId: string) => void;
  onKarteLoeschen: (karteId: string) => void;
  onKartenImportieren: (paare: KartePaar[]) => void;
}

export function KartenVerwaltung({
  set,
  karten,
  onZurueck,
  onNeueKarte,
  onKarteBearbeiten,
  onKarteLoeschen,
  onKartenImportieren,
}: Props) {
  const [importOffen, setImportOffen] = useState(false);
  const [importPaare, setImportPaare] = useState<KartePaar[]>([]);
  const [loeschKandidat, setLoeschKandidat] = useState<string | null>(null);

  const sortiert = sortiereKarten(karten);

  return (
    <div>
      <div className="zurueck-zeile">
        <button className="btn secondary" onClick={onZurueck}>
          ← Zurück zum Set
        </button>
      </div>

      <h2>{set.name} — Karten</h2>
      <p className="note">
        {karten.length} {karten.length === 1 ? "Karte" : "Karten"}
      </p>

      <div className="btn-row">
        <button className="btn secondary" onClick={onNeueKarte}>
          + Einzelkarte
        </button>
        <button className="btn secondary" onClick={() => setImportOffen((o) => !o)}>
          + Karten (Text)
        </button>
      </div>

      {importOffen && (
        <div className="card accent-salbei" style={{ marginTop: "1rem" }}>
          <h3>Karten hinzufügen</h3>
          <TextImportFeld onChange={setImportPaare} />
          <div className="btn-row">
            <button
              className="btn salbei"
              disabled={importPaare.length === 0}
              onClick={() => {
                onKartenImportieren(importPaare);
                setImportPaare([]);
                setImportOffen(false);
              }}
            >
              {importPaare.length} Karten in den Vorrat
            </button>
            <button className="btn secondary" onClick={() => setImportOffen(false)}>
              Schliessen
            </button>
          </div>
        </div>
      )}

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      {sortiert.length === 0 ? (
        <p className="empty-state">Dieses Set hat noch keine Karten.</p>
      ) : (
        sortiert.map((karte) => (
          <div className="karten-liste-eintrag" key={karte.id}>
            <div className="zeile-zwischen">
              <div style={{ flex: 1 }}>
                <div className="vs">{karte.vorderseite}</div>
                <div className="rs">{karte.rueckseite}</div>
              </div>
              <span
                className="mini-box-marke"
                style={{ color: istGestartet(karte) ? "var(--salbei-tief)" : "var(--text)", opacity: istGestartet(karte) ? 1 : 0.6 }}
              >
                {istGestartet(karte) ? `Box ${karte.box}` : "Vorrat"}
              </span>
            </div>
            {karte.bildBase64 && (
              <img src={karte.bildBase64} alt="" style={{ maxHeight: "80px", marginTop: "0.4rem", borderRadius: "3px" }} />
            )}
            <div className="btn-row" style={{ marginTop: "0.5rem" }}>
              <button className="btn secondary klein" onClick={() => onKarteBearbeiten(karte.id)}>
                Bearbeiten
              </button>
              <button className="btn secondary klein" onClick={() => setLoeschKandidat(karte.id)}>
                Löschen
              </button>
            </div>
            {loeschKandidat === karte.id && (
              <div style={{ marginTop: "0.6rem" }}>
                <ConfirmDialog
                  frage={`Karte „${karte.vorderseite}“ löschen?`}
                  onBestaetigen={() => {
                    onKarteLoeschen(karte.id);
                    setLoeschKandidat(null);
                  }}
                  onAbbrechen={() => setLoeschKandidat(null)}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
