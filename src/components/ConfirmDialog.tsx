interface Props {
  frage: string;
  onBestaetigen: () => void;
  onAbbrechen: () => void;
  bestaetigenText?: string;
}

export function ConfirmDialog({ frage, onBestaetigen, onAbbrechen, bestaetigenText = "Ja, löschen" }: Props) {
  return (
    <div className="card accent-bordeaux">
      <p>{frage}</p>
      <div className="btn-row">
        <button className="btn" onClick={onBestaetigen}>
          {bestaetigenText}
        </button>
        <button className="btn secondary" onClick={onAbbrechen}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
