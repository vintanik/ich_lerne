// Führt eine Aufgabe aus und wiederholt sie bei einem Fehler nach kurzen
// Pausen, bevor der Fehler an den Aufrufer geht. Gedacht fürs erste Laden
// nach Start/Anmeldung: dort schlägt der erste Versuch gelegentlich nur
// deshalb fehl, weil der Rechner gerade aus dem Ruhezustand erwacht (Netz noch
// nicht da) oder der Zugriffstoken in diesem Moment erneuert wird — nach
// einer Sekunde klappt dasselbe ohne Zutun.

const PAUSEN_MS = [500, 1500, 3000];

export async function mitWiederholung<T>(
  aufgabe: () => Promise<T>,
  abgebrochen: () => boolean = () => false,
  pausenMs: number[] = PAUSEN_MS,
): Promise<T> {
  for (let versuch = 0; ; versuch++) {
    try {
      return await aufgabe();
    } catch (fehler) {
      if (versuch >= pausenMs.length || abgebrochen()) throw fehler;
      await new Promise((weiter) => setTimeout(weiter, pausenMs[versuch]));
    }
  }
}
