import { useState } from "react";
import { supabase } from "../supabaseClient";

type Modus = "anmelden" | "registrieren" | "passwort-vergessen";

type Zustand =
  | { typ: "eingabe" }
  | { typ: "sendet" }
  | { typ: "registriert-bestaetigung-noetig"; email: string }
  | { typ: "reset-gesendet"; email: string }
  | { typ: "fehler"; meldung: string };

export function LoginScreen() {
  const [modus, setModus] = useState<Modus>("anmelden");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [zustand, setZustand] = useState<Zustand>({ typ: "eingabe" });

  function modusWechseln(neuerModus: Modus) {
    setModus(neuerModus);
    setZustand({ typ: "eingabe" });
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (modus === "passwort-vergessen") {
      setZustand({ typ: "sendet" });
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setZustand({ typ: "fehler", meldung: error.message });
      } else {
        setZustand({ typ: "reset-gesendet", email: trimmedEmail });
      }
      return;
    }

    if (!passwort) return;
    setZustand({ typ: "sendet" });

    if (modus === "registrieren") {
      const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password: passwort });
      if (error) {
        setZustand({ typ: "fehler", meldung: error.message });
      } else if (!data.session) {
        // Kein Session zurück: Projekt verlangt E-Mail-Bestätigung vor dem
        // ersten Login. Ist die Bestätigung im Dashboard deaktiviert, kommt
        // stattdessen sofort eine Session zurück — dann übernimmt useSession
        // automatisch, ohne dass hier ein Sonderfall nötig ist.
        setZustand({ typ: "registriert-bestaetigung-noetig", email: trimmedEmail });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: passwort });
      if (error) {
        setZustand({ typ: "fehler", meldung: error.message });
      }
      // Bei Erfolg übernimmt useSession über onAuthStateChange automatisch.
    }
  }

  const zeigtBestaetigung = zustand.typ === "registriert-bestaetigung-noetig" || zustand.typ === "reset-gesendet";

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
        {zustand.typ === "registriert-bestaetigung-noetig" && (
          <>
            <h2>Fast geschafft</h2>
            <p>
              Bestätigungsmail gesendet an <strong>{zustand.email}</strong> — bitte E-Mail-Postfach öffnen und den
              Link antippen, um dein Konto zu aktivieren.
            </p>
          </>
        )}

        {zustand.typ === "reset-gesendet" && (
          <>
            <h2>Mail unterwegs</h2>
            <p>
              Link zum Zurücksetzen gesendet an <strong>{zustand.email}</strong> — bitte E-Mail-Postfach öffnen und
              den Link antippen, um ein neues Passwort zu setzen.
            </p>
          </>
        )}

        {!zeigtBestaetigung && (
          <>
            <h2>
              {modus === "passwort-vergessen" ? "Passwort zurücksetzen" : modus === "registrieren" ? "Registrieren" : "Anmelden"}
            </h2>

            {modus !== "passwort-vergessen" && (
              <div className="tag-row">
                <button
                  type="button"
                  className={`tag${modus === "anmelden" ? " selected" : ""}`}
                  onClick={() => modusWechseln("anmelden")}
                >
                  Anmelden
                </button>
                <button
                  type="button"
                  className={`tag${modus === "registrieren" ? " selected" : ""}`}
                  onClick={() => modusWechseln("registrieren")}
                >
                  Registrieren
                </button>
              </div>
            )}

            <form onSubmit={absenden}>
              <div className="field">
                <label htmlFor="login-email">E-Mail-Adresse</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.ch"
                  required
                  autoFocus
                />
              </div>

              {modus !== "passwort-vergessen" && (
                <div className="field">
                  <label htmlFor="login-passwort">Passwort</label>
                  <input
                    id="login-passwort"
                    type="password"
                    value={passwort}
                    onChange={(e) => setPasswort(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    minLength={6}
                    required
                  />
                </div>
              )}

              {zustand.typ === "fehler" && <p className="note">{zustand.meldung}</p>}

              <div className="btn-row">
                <button type="submit" className="btn block" disabled={zustand.typ === "sendet"}>
                  {zustand.typ === "sendet"
                    ? "Sendet…"
                    : modus === "passwort-vergessen"
                      ? "Link senden"
                      : modus === "registrieren"
                        ? "Registrieren"
                        : "Anmelden"}
                </button>
              </div>
            </form>

            <p className="note" style={{ marginTop: "0.75rem" }}>
              {modus === "passwort-vergessen" ? (
                <button type="button" className="note" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} onClick={() => modusWechseln("anmelden")}>
                  ← Zurück zur Anmeldung
                </button>
              ) : (
                <button
                  type="button"
                  className="note"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  onClick={() => modusWechseln("passwort-vergessen")}
                >
                  Passwort vergessen?
                </button>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
