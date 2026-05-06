// src/supabase.js
// Initializes the Supabase client using config.js values.
// Loaded after the Supabase CDN script and config.js.
(function () {
  const { createClient } = window.supabase;
  window.darvisDb = createClient(
    window.DARVIS_CONFIG.supabaseUrl,
    window.DARVIS_CONFIG.supabaseKey
  );
})();
