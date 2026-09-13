import { useMemo, useState } from "react";
import { ALLE_BOXEN, gestarteteKarten, istFaellig, mische, nachAntwort } from "../leitner";
import type { Karte, KartenSet, LernBereich, LernErgebnis } from "../types";
import { BoxBalken } from "./BoxBalken";
import { LernModus } from "./LernModus";

interface Props {
  sets: KartenSet[];
  karten: Karte[];
  startBereich: LernBereich;
  onAntwort: (karteId: string, richtig: boolean) => void;
  onFertig: () => void;
}

type Phase =
  | { name: "vorbereit"; bereich: LernBereich }
  | { name: "runde"; karten: Karte[]; nr: number; bereich: LernBereich }
  | { name: "abschluss"; ergebnisse: LernErgebnis[]; kartenIds: string[]; bereich: LernBereich };

export function LernenRoute({ sets, karten, startBereich, onAntwort, onFertig }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "vorbereit", bereich: startBereich });
  const [nurFaellige, setNurFaellige] = useState(true);

  // Immer nur gestartete Karten — Vorrat wird nie trainiert.
  function kartenFuerBereich(bereich: LernBereich): Karte[] {
    if (bereich.typ === "box") {
      return gestarteteKarten(karten.filter((k) => k.setId === bereich.setId && k.box === bereich.box));
    }
    return gestarteteKarten(karten.filter((k) => k.setId === bereich.setId));
  }

  // Für die Fortschrittsleiste im Trainer: bei "box" bewusst das GANZE Set
  // (alle Boxen), nicht nur die geübte Box — sonst sähen die übrigen vier
  // Boxen leer aus, und Karten, die während der Runde die Box wechseln,
  // würden aus der Anzeige verschwinden statt in ihrer neuen Box aufzutauchen.
  function kartenFuerUebersicht(bereich: LernBereich): Karte[] {
    if (bereich.typ === "box") return gestarteteKarten(karten.filter((k) => k.setId === bereich.setId));
    return kartenFuerBereich(bereich);
  }

  function bereichLabel(bereich: LernBereich): string {
    const setName = sets.find((s) => s.id === bereich.setId)?.name ?? "Set";
    if (bereich.typ === "box") return `${setName} / Box ${bereich.box}`;
    return setName;
  }

  // --- Vorbereitung ----------------------------------------------
  if (phase.name === "vorbereit") {
    const alle = kartenFuerBereich(phase.bereich);
    const faellige = alle.filter((k) => istFaellig(k));
    // "Box üben" ist bewusste, gezielte Wiederholung — unabhängig von der
    // Fälligkeit, deshalb hier immer alle Karten der Box, kein Häkchen.
    const istBoxBereich = phase.bereich.typ === "box";
    const auswahl = istBoxBereich ? alle : nurFaellige ? faellige : alle;

    return (
      <div>
        <div className="zurueck-zeile">
          <button className="btn secondary klein" onClick={onFertig}>
            ← Abbrechen
          </button>
        </div>

        <h2>{bereichLabel(phase.bereich)}</h2>
        <p className="note">
          {istBoxBereich
            ? `${alle.length} ${alle.length === 1 ? "Karte" : "Karten"} in dieser Box.`
            : `${faellige.length} von ${alle.length} Karten sind fällig.`}
        </p>

        {!istBoxBereich && (
          <label style={{ textTransform: "none", letterSpacing: 0, color: "var(--text)", fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={nurFaellige}
              onChange={(e) => setNurFaellige(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Nur fällige Karten (sonst alle {alle.length} üben)
          </label>
        )}

        <div className="btn-row" style={{ marginTop: "1.25rem" }}>
          <button
            className="btn"
            disabled={auswahl.length === 0}
            onClick={() => setPhase({ name: "runde", karten: mische(auswahl), nr: 1, bereich: phase.bereich })}
          >
            {auswahl.length === 0 ? "Keine Karten" : `Los geht's (${auswahl.length})`}
          </button>
        </div>

        {auswahl.length === 0 && (
          <p className="note" style={{ marginTop: "1rem" }}>
            {istBoxBereich
              ? "Diese Box ist gerade leer."
              : nurFaellige
                ? "Gerade nichts fällig — schön! Du kannst später wiederkommen oder das Häkchen entfernen, um alle zu üben."
                : "Hier ist noch nichts im Lernen. Hol dir im Set erst ein paar Wörter aus dem Vorrat."}
          </p>
        )}
      </div>
    );
  }

  // --- Laufende Runde ------------------------------------------
  if (phase.name === "runde") {
    const kartenIds = phase.karten.map((k) => k.id);
    return (
      <LernModus
        key={`runde-${phase.nr}`}
        karten={phase.karten}
        scopeKarten={kartenFuerUebersicht(phase.bereich)}
        scopeLabel={bereichLabel(phase.bereich)}
        aktiveBox={phase.bereich.typ === "box" ? phase.bereich.box : undefined}
        onBewertung={(karte, richtig) => onAntwort(karte.id, richtig)}
        onKomplett={(bewertungen) =>
          setPhase({
            name: "abschluss",
            ergebnisse: bewertungen.map((b) => ({
              karteId: b.karte.id,
              vorderseite: b.karte.vorderseite,
              richtig: b.richtig,
              alteBox: b.karte.box,
              neueBox: nachAntwort(b.karte, b.richtig).box,
            })),
            kartenIds,
            bereich: phase.bereich,
          })
        }
        onAbbrechen={onFertig}
      />
    );
  }

  // --- Abschluss ----------------------------------------------
  return (
    <Abschluss
      ergebnisse={phase.ergebnisse}
      karten={karten.filter((k) => phase.kartenIds.includes(k.id))}
      onNochmalFalsche={(falscheIds) => {
        const falsche = karten.filter((k) => falscheIds.includes(k.id));
        setPhase({ name: "runde", karten: mische(falsche), nr: Date.now(), bereich: phase.bereich });
      }}
      onFertig={onFertig}
    />
  );
}

function Abschluss({
  ergebnisse,
  karten,
  onNochmalFalsche,
  onFertig,
}: {
  ergebnisse: LernErgebnis[];
  karten: Karte[];
  onNochmalFalsche: (falscheIds: string[]) => void;
  onFertig: () => void;
}) {
  const richtig = ergebnisse.filter((e) => e.richtig).length;
  const falsch = ergebnisse.length - richtig;
  const letzterVersuch = useMemo(() => {
    const map = new Map<string, LernErgebnis>();
    for (const e of ergebnisse) map.set(e.karteId, e);
    return [...map.values()];
  }, [ergebnisse]);
  const falscheIds = letzterVersuch.filter((e) => !e.richtig).map((e) => e.karteId);

  return (
    <div>
      <div className="card accent-salbei" style={{ textAlign: "center" }}>
        <h2>Runde geschafft!</h2>
        <p style={{ fontSize: "1.1rem" }}>
          <strong style={{ color: "var(--salbei-tief)" }}>{richtig} richtig</strong> ·{" "}
          <strong style={{ color: "var(--bordeaux)" }}>{falsch} falsch</strong>
          <br />
          <span className="note">{ergebnisse.length} Bewertungen insgesamt</span>
        </p>
      </div>

      <h3>Diese Karten stehen jetzt in…</h3>
      <div className="card">
        <BoxBalken karten={karten} />
      </div>

      <div className="stapel">
        {ALLE_BOXEN.map((b) => {
          const drin = karten.filter((k) => k.box === b);
          if (drin.length === 0) return null;
          return (
            <div className="zeile-zwischen" key={b}>
              <span className="note" style={{ margin: 0 }}>
                Box {b}
              </span>
              <span>{drin.length}</span>
            </div>
          );
        })}
      </div>

      <div className="btn-row" style={{ marginTop: "1.5rem" }}>
        {falscheIds.length > 0 && (
          <button className="btn" onClick={() => onNochmalFalsche(falscheIds)}>
            {falscheIds.length} falsche nochmal üben
          </button>
        )}
        <button className="btn secondary" onClick={onFertig}>
          Fertig
        </button>
      </div>
    </div>
  );
}
