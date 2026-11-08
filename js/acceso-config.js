/* Casa Siego — acceso-config.js
   Public values only: the publishable key is meant for the browser; access is enforced by Supabase Auth and RLS.
   URL and key come from js/supabase-config.js (written from .env by tools/env-a-config.py), which must load first.
   Empty supabaseUrl / publishableKey = Supabase not configured yet: every sign-in attempt fails and is redirected.
   Auth settings (no sign-up, PKCE, 15-min JWT, Turnstile): _interno/acceso/config.toml.ejemplo (local, not published). */
var SB = window.CASASIEGO_SUPABASE || {};
window.CASASIEGO_ACCESO = {
  supabaseUrl: SB.url || '',              // https://<ref>.supabase.co
  publishableKey: SB.publishableKey || '', // sb_publishable_…
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  redirectOnError: 'visitante.html', // wrong credentials or any failure (relative to the home page)
  redirectOnSuccess: 'cuenta/',      // after «Encantados de volvernos a encontrar»: the member's account page
  redirectOnSkip: 'visitante.html', // «Omitir»: copy of the home page without the gate (v1.0.0 Unrecognized visitor)
  messageMs: 3200,                 // how long the white message card stays before redirecting / opening
  timeoutMs: 10000                 // give up on Supabase after this and treat it as an error
};
