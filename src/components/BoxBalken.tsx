import { ALLE_BOXEN, BOX_INTERVALL_LABEL, boxVerteilung } from "../leitner";
import type { BoxNummer, Karte } from "../types";

const BOX_FARBE: Record<BoxNummer, string> = {
  1: "var(--box-1)",
  2: "var(--box-2)",
  3: "var(--box-3)",
  4: "var(--box-4)",
  5: "var(--box-5)",
};

interface Props {
  karten: Karte[];
  mitLegende?: boolean;
}

/** Kleine Balkengrafik über die 5 Leitner-Boxen. */
export function BoxBalken({ karten, mitLegende = true }: Props) {
  const verteilung = boxVerteilung(karten);
  const gesamt = karten.length;

  return (
    <div>
      <div
        className="box-balken"
        role="img"
        aria-label={ALLE_BOXEN.map((b) => `Box ${b}: ${verteilung[b]}`).join(", ")}
      >
        {gesamt === 0
          ? null
          : ALLE_BOXEN.map((b) =>
              verteilung[b] > 0 ? (
                <div
                  key={b}
                  className="box-balken-segment"
                  style={{ width: `${(verteilung[b] / gesamt) * 100}%`, background: BOX_FARBE[b] }}
                />
              ) : null,
            )}
      </div>
      {mitLegende && (
        <div className="box-legende">
          {ALLE_BOXEN.map((b) => (
            <span className="box-legende-eintrag" key={b} title={BOX_INTERVALL_LABEL[b]}>
              <span className="box-punkt" style={{ background: BOX_FARBE[b] }} />
              Box {b}: {verteilung[b]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
