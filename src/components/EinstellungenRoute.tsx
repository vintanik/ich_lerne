import { useRef, useState } from "react";
import { heuteIso } from "../leitner";
import { supabase } from "../supabaseClient";
import type { Hintergrund } from "../storage";
import type { DatenBestand } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  hintergrund: Hintergrund;
  onHintergrund: (wert: Hintergrund) => void;
  onExport: () => Promise<string>;
  onImport: (json: string) => Promise<DatenBestand>;
  onImportUebernommen: (bestand: DatenBestand) => void;
  onZurueck: () => void;
}

export function EinstellungenRoute({
  hintergrund,
  onHintergrund,
  onExport,
  onImport,
  onImportUebernommen,
  onZurueck,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ausstehend, setAusstehend] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [exportiert, setExportiert] = useState(false);
  const [stelltWiederHer, setStelltWiederHer] = useState(false);

  async function backupSpeichern() {
    setFehler(null);
    setExportiert(true);
    try {
      const json = await onExport();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ich-lerne-backup-${heuteIso()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setFehler("Backup konnte nicht erstellt werden.");
    } finally {
      setExportiert(false);
    }
  }

  function dateiAusgewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setFehler(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        JSON.parse(text);
        setAusstehend(text);
      } catch {
        setFehler("Diese Datei ist kein gültiges Backup.");
      }
    };
    reader.readAsText(datei);
  }

  async function wiederherstellen() {
    if (!ausstehend || stelltWiederHer) return;
    setStelltWiederHer(true);
    try {
      const bestand = await onImport(ausstehend);
      onImportUebernommen(bestand);
    } catch {
      setFehler("Die Wiederherstellung ist fehlgeschlagen — Datei prüfen.");
      setAusstehend(null);
      setStelltWiederHer(false);
    }
  }

  return (
    <div>
      <div className="zurueck-zeile">
        <button className="btn secondary" onClick={onZurueck}>
          ← Zurück
        </button>
      </div>

      <h2>Einstellungen</h2>

      <div className="card accent-salbei">
        <h3>Konto</h3>
        <div className="btn-row">
          <button className="btn salbei secondary" onClick={() => supabase.auth.signOut()}>
            Abmelden
          </button>
        </div>
      </div>

      <div className="ornament">
        <span className="dot" />
      </div>

      <h3>Darstellung</h3>
      <div className="tag-row">
        <button
          className={`tag${hintergrund === "vintage" ? " selected" : ""}`}
          onClick={() => onHintergrund("vintage")}
        >
          Vintage-Papier
        </button>
        <button
          className={`tag${hintergrund === "modern" ? " selected" : ""}`}
          onClick={() => onHintergrund("modern")}
        >
          Modern / clean
        </button>
      </div>

      <div className="ornament salbei">
        <span className="dot" />
      </div>

      <h3>Backup</h3>
      <p className="note">
        Deine Karten liegen in deinem Konto und sind auf allen Geräten synchron. Ein Backup ist trotzdem
        sinnvoll als zusätzliche Sicherung.
      </p>

      <div className="card accent-salbei">
        <h3>Backup speichern</h3>
        <p>Lädt eine JSON-Datei mit allen deinen Sets und Karten herunter.</p>
        <div className="btn-row">
          <button className="btn salbei" onClick={backupSpeichern} disabled={exportiert}>
            {exportiert ? "Erstellt…" : "Backup speichern"}
          </button>
        </div>
      </div>

      <div className="card accent-bordeaux" style={{ marginTop: "1.25rem" }}>
        <h3>Backup wiederherstellen</h3>
        <p className="note">Achtung: ersetzt alle aktuell gespeicherten Karten in deinem Konto.</p>
        <div className="btn-row">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Datei auswählen
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={dateiAusgewaehlt}
          style={{ display: "none" }}
        />
      </div>

      {fehler && <p className="note">{fehler}</p>}

      {ausstehend && (
        <div style={{ marginTop: "1.25rem" }}>
          <ConfirmDialog
            frage="Backup wiederherstellen? Alle aktuellen Karten werden ersetzt."
            bestaetigenText={stelltWiederHer ? "Stellt wieder her…" : "Ja, wiederherstellen"}
            onBestaetigen={wiederherstellen}
            onAbbrechen={() => setAusstehend(null)}
          />
        </div>
      )}

      <div className="ornament">
        <span className="dot" />
      </div>
      <p className="note">„Ich lerne“ — vorläufiger Projektname.</p>
    </div>
  );
}
