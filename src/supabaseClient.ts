import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fehlt in der Entwicklung meist, weil .env (aus .env.example) noch nicht
  // angelegt wurde — bewusst ein klarer Hinweis statt eines kryptischen
  // Fehlers tief in der Supabase-Bibliothek.
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. Bitte .env.example zu .env kopieren und mit den echten Werten aus dem Supabase-Dashboard befüllen.",
  );
}

export const supabase = createClient(url, anonKey);
