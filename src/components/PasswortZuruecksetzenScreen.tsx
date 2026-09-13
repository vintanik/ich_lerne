import { useState } from "react";
import { supabase } from "../supabaseClient";

interface Props {
  onFertig: () => void;
}

type Zustand = { typ: "eingabe" } | { typ: "speichert" } | { typ: "fehler"; meldung: string };

export function PasswortZuruecksetzenScreen({ onFertig }: Props) {
  const [passwort, setPasswort] = useState("");
  const [zustand, setZustand] = useState<Zustand>({ typ: "eingabe" });

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!passwort) return;
    setZustand({ typ: "speichert" });
    const { error } = await supabase.auth.updateUser({ password: passwort });
    if (error) {
      setZustand({ typ: "fehler", meldung: error.message });
    } else {
      onFertig();
    }
  }

  return (
    <div className="app-shell">
      <header className="brand-header">
        <div className="brand-name">Ich lerne</div>
        <div className="brand-sub">Karteikarten nach Leitner</div>
      </header>

      <div className="ornament">
        <span className="dot" />
      </div>

      <div className="card accent-bordeaux">
        <h2>Neues Passwort setzen</h2>
        <p className="note">Vergib ein neues Passwort für dein Konto.</p>

        <form onSubmit={absenden}>
          <div className="field">
            <label htmlFor="neues-passwort">Neues Passwort</label>
            <input
              id="neues-passwort"
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              minLength={6}
              required
              autoFocus
            />
          </div>

          {zustand.typ === "fehler" && <p className="note">{zustand.meldung}</p>}

          <div className="btn-row">
            <button type="submit" className="btn block" disabled={zustand.typ === "speichert"}>
              {zustand.typ === "speichert" ? "Speichert…" : "Passwort setzen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
