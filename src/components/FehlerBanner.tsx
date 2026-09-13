interface Props {
  meldung: string;
  onSchliessen: () => void;
}

export function FehlerBanner({ meldung, onSchliessen }: Props) {
  return (
    <div className="fehler-banner">
      <span>{meldung}</span>
      <button className="btn secondary klein" onClick={onSchliessen}>
        OK
      </button>
    </div>
  );
}
