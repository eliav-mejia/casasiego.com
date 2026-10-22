/* Casa Siego — registro-config.js (Variante D · registro e inicio de sesión)
   Public values only. Same Supabase project as acceso-config.js; Auth settings in _interno/acceso/variante-d/config.toml.ejemplo.
   Empty supabaseUrl / publishableKey = Supabase not configured yet: the letter can be written but is not sent (demo).
   avisos / campos below are the DEMO fallback; with Supabase the page reads public.formulario_registro(marca, campana). */
window.CASASIEGO_REGISTRO = {
  supabaseUrl: '',                 // https://<ref>.supabase.co
  publishableKey: '',              // sb_publishable_…
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  turnstileSiteKey: '',            // Cloudflare Turnstile (public). Empty = no captcha (only for the test project)
  bitacoraBorde: '/api/acceso/evento', // Worker acceso-borde (D1). '' = off (GitHub Pages without Cloudflare in front)
  proveedores: ['google', 'facebook', 'apple', 'azure'], // azure = Microsoft in Supabase Auth
  redirectOnSuccess: 'index.html',
  messageMs: 3200,
  timeoutMs: 10000,

  avisos: [
    { tipo: 'privacidad', version: '2026-10', url: 'terms.html#privacidad', obligatorio: true },
    { tipo: 'terminos',   version: '2026-10', url: 'terms.html',            obligatorio: true },
    { tipo: 'marketing',  version: '2026-10', url: 'terms.html#novedades',  obligatorio: false }
  ],
  campos: {
    casa:  [{ clave: 'interes', tipo: 'opcion', opciones: ['retrato', 'sastreria', 'mascotas'], etiqueta: 'lo que más me trae a la Casa' }],
    fiel:  [{ clave: 'nombre_mascota', tipo: 'texto', max_largo: 40, etiqueta: 'el nombre de mi compañero' },
            { clave: 'especie', tipo: 'opcion', opciones: ['perro', 'gato', 'otro'], etiqueta: 'su especie' }],
    justo: [{ clave: 'ocasion', tipo: 'opcion', opciones: ['boda', 'trabajo', 'gala', 'diario'], etiqueta: 'la ocasión de mi traje' }]
  }
};
