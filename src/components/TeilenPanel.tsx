import { useState } from "react";

interface Props {
  onTeilen: () => Promise<string>;
  label: string;
}

type Zustand = { typ: "start" } | { typ: "sendet" } | { typ: "erstellt"; link: string } | { typ: "fehler" };

/** Erzeugt auf Klick einen Freigabe-Link (öffentlich, ohne Login) und zeigt ihn zum Kopieren an. */
export function TeilenPanel({ onTeilen, label }: Props) {
  const [zustand, setZustand] = useState<Zustand>({ typ: "start" });
  const [kopiert, setKopiert] = useState(false);

  async function teilen() {
    setZustand({ typ: "sendet" });
    try {
      const link = await onTeilen();
      setZustand({ typ: "erstellt", link });
    } catch {
      setZustand({ typ: "fehler" });
    }
  }

  if (zustand.typ === "erstellt") {
    return (
      <div className="field" style={{ maxWidth: "26rem" }}>
        <label>Link zum Teilen</label>
        <div className="btn-row" style={{ flexWrap: "nowrap" }}>
          <input type="text" readOnly value={zustand.link} onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn secondary klein"
            onClick={async () => {
              await navigator.clipboard.writeText(zustand.link);
              setKopiert(true);
              setTimeout(() => setKopiert(false), 1500);
            }}
          >
            {kopiert ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
        <p className="note">
          Empfänger:innen sehen eine eigenständige Kopie zum Übernehmen — spätere Änderungen hier wirken sich nicht
          darauf aus.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="link-btn" onClick={teilen} disabled={zustand.typ === "sendet"}>
        {zustand.typ === "sendet" ? "Erstellt Link…" : label}
      </button>
      {zustand.typ === "fehler" && <p className="note">Teilen fehlgeschlagen — bitte erneut versuchen.</p>}
    </div>
  );
}
