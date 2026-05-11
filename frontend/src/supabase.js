// src/supabase.js
// Initializes the Supabase client using config.js values.
import { createClient } from "@supabase/supabase-js";
import { DARVIS_CONFIG } from "./config.js";

export const db = createClient(
  DARVIS_CONFIG.supabaseUrl,
  DARVIS_CONFIG.supabaseKey
);
