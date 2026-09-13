import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

interface SessionState {
  session: Session | null;
  // true nur während der allerersten Prüfung beim App-Start — verhindert ein
  // kurzes Aufblitzen des Login-Screens, bevor eine vorhandene Sitzung geladen ist.
  laedt: boolean;
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLaedt(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, neueSession) => {
      setSession(neueSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return { session, laedt };
}
