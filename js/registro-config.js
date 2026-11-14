/* Casa Siego — registro-config.js 1.3.0 (crear cuenta o iniciar sesión · registro.html, v1.4.0 · v1.4.2)
   Public values only. Same Supabase project as acceso-config.js; Auth settings in _interno/acceso/variante-d/config.toml.ejemplo.
   Empty supabaseUrl / publishableKey = Supabase not configured yet: the letter can be written but is not sent (demo).
   avisos / campos below are the DEMO fallback; with Supabase the page reads public.formulario_registro(marca, campana). */
window.CASASIEGO_REGISTRO = {
  supabaseUrl: (window.CASASIEGO_SUPABASE || {}).url || '',            // js/supabase-config.js (from .env)
  publishableKey: (window.CASASIEGO_SUPABASE || {}).publishableKey || '',
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
  turnstileSiteKey: (window.CASASIEGO_SUPABASE || {}).turnstileSiteKey || '', // Cloudflare Turnstile (public). Empty = no captcha
  bitacoraBorde: '/api/acceso/evento', // Worker acceso-borde (D1). '' = off (GitHub Pages without Cloudflare in front)
  proveedores: ['google', 'azure', 'linkedin_oidc', 'facebook'], // azure = Microsoft · linkedin_oidc = LinkedIn (OIDC)
  redirectOnSuccess: 'index.html?bienvenida=1', // v1.4.0: main index; js/medidas.js asks for current measurements
  destinosVolver: ['membresia/equipo/', 'membresia/eventos/', 'cuenta/', 'cita/', 'cita/virtual/', 'brands/justo/agendar/', 'brands/atemporal/agendar/'], // v1.4.2 ?volver= whitelist (js/solo-miembros.js)
  emailRedirect: 'registro.html',  // confirmation link of the e-mail sign-up comes back here (in additional_redirect_urls)
  reglaContrasena: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$', // mirror of config.toml (8, lower_upper_letters_digits)
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
