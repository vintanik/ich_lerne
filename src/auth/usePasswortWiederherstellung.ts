import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Eigenständiges, separates Auth-Abo (rührt useSession.ts bewusst nicht an):
// ein Klick auf den "Passwort vergessen"-Link liefert eine kurzzeitige
// Recovery-Session zurück in die App und feuert dabei das spezielle
// PASSWORD_RECOVERY-Event. Ohne diese Erkennung würde App.tsx die Session
// fälschlich als normalen Login behandeln und direkt in die Haupt-App
// springen, statt das neue Passwort abzufragen.
export function usePasswortWiederherstellung(): {
  istWiederherstellung: boolean;
  abschliessen: () => void;
} {
  const [istWiederherstellung, setIstWiederherstellung] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIstWiederherstellung(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { istWiederherstellung, abschliessen: () => setIstWiederherstellung(false) };
}
