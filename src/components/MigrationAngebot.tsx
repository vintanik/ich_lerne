import { useState } from "react";
import { uebertrageLokaleDatenInsKonto } from "../cloudMigration";
import { setMigrationAngeboten } from "../storage";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  userId: string;
  onFertig: () => void;
}

export function MigrationAngebot({ userId, onFertig }: Props) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function uebernehmen() {
    if (laeuft) return;
    setLaeuft(true);
    setFehler(null);
    try {
      await uebertrageLokaleDatenInsKonto(userId);
      setMigrationAngeboten();
      onFertig();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler bei der Übernahme.");
      setLaeuft(false);
    }
  }

  function ablehnen() {
    setMigrationAngeboten();
    onFertig();
  }

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      {fehler && <p className="note">Übernahme fehlgeschlagen: {fehler} — du kannst es nochmal versuchen.</p>}
      <ConfirmDialog
        frage="Auf diesem Gerät liegen bereits Karten-Sets. Vorhandene lokale Daten in dein Konto übernehmen? Danach ist dein Konto die führende Quelle."
        bestaetigenText={laeuft ? "Übernimmt…" : "Ja, übernehmen"}
        onBestaetigen={uebernehmen}
        onAbbrechen={ablehnen}
      />
    </div>
  );
}
