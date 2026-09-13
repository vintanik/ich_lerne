import { useRef, useState } from "react";

interface Props {
  bildBase64?: string;
  onChange: (bildBase64: string | undefined) => void;
}

const MAX_KANTE = 900;

// Bild vor dem Speichern verkleinern — IndexedDB verkraftet zwar mehr als
// localStorage, aber Karten sollen trotzdem nicht megabyteweise wachsen.
function verkleinern(datei: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leser = new FileReader();
    leser.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    leser.onload = () => {
      const bild = new Image();
      bild.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      bild.onload = () => {
        const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
        const breite = Math.round(bild.width * faktor);
        const hoehe = Math.round(bild.height * faktor);
        const canvas = document.createElement("canvas");
        canvas.width = breite;
        canvas.height = hoehe;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas nicht verfügbar"));
        ctx.drawImage(bild, 0, 0, breite, hoehe);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      bild.src = leser.result as string;
    };
    leser.readAsDataURL(datei);
  });
}

export function BildFeld({ bildBase64, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function ausgewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setFehler(null);
    setLaedt(true);
    try {
      onChange(await verkleinern(datei));
    } catch {
      setFehler("Dieses Bild konnte nicht verarbeitet werden.");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <div className="field">
      <label>Bild (optional)</label>
      {bildBase64 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <img
            src={bildBase64}
            alt="Kartenbild"
            style={{ maxHeight: "150px", borderRadius: "4px", border: "1px solid var(--border-dark)" }}
          />
        </div>
      )}
      <div className="btn-row">
        <button type="button" className="btn secondary klein" onClick={() => inputRef.current?.click()} disabled={laedt}>
          {laedt ? "Verarbeitet…" : bildBase64 ? "Bild ersetzen" : "Bild wählen"}
        </button>
        {bildBase64 && (
          <button type="button" className="btn secondary klein" onClick={() => onChange(undefined)}>
            Bild entfernen
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={ausgewaehlt} style={{ display: "none" }} />
      {fehler && <p className="note">{fehler}</p>}
    </div>
  );
}
