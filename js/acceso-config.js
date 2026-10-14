/* Synodé — acceso-config.js
   Public values only: the publishable key is meant for the browser; access is enforced by Supabase Auth and RLS.
   Empty supabaseUrl / publishableKey = Supabase not configured yet: every sign-in attempt fails and is redirected.
   Auth settings (no sign-up, PKCE, 15-min JWT, Turnstile): _interno/acceso/config.toml.ejemplo (local, not published). */
window.SYNODE_ACCESO = {
  supabaseUrl: '',                 // https://<ref>.supabase.co
  publishableKey: '',              // sb_publishable_…
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  redirectOnError: 'brands/fiel/', // relative to the home page; Fiel has no gate
  redirectOnSkip: 'visitante.html', // «Omitir»: copy of the home page without the gate (v1.0.0 Unrecognized visitor)
  messageMs: 3200,                 // how long the white message card stays before redirecting / opening
  timeoutMs: 10000                 // give up on Supabase after this and treat it as an error
};
