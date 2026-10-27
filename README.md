# casasiego.com

Sitio de **Casa Siego®** (antes Synodé) y sus marcas: Fiel (retrato ejecutivo, familiar y de mascotas) y Justo (sastrería). Sitio estático en GitHub Pages, sin paso de build.

- Repositorio: <https://github.com/eliav-mejia/casasiego.com> (antes `eliav-mejia/synode.space`; GitHub redirige el nombre viejo)
- Dominio: <https://casasiego.com> (`CNAME`), `www` redirige al dominio raíz · correo público: `info@casasiego.com`
- Versión: **1.1.0 — cambio de marca** · documentación: `docs/casasiego-v1.1.0.pdf` (fuente `docs/src/casasiego-v1.1.0.html`)
- Carpeta local: `Meyer/sites/casasiego.com/` (antes `sites/synode.space/`)

```
casasiego.com/
├── index.html                    portada Casa Siego (venta cruzada): Cap. I trajes (Justo), Cap. II mascotas (Fiel) · sin pop-up de enfoque desde v1.2.3
├── visitante.html                copia de la portada sin pop-up, destino de «Omitir»: Cap. I trajes (Justo), Cap. II mascotas (Fiel)
├── membresia/
│   ├── index.html                términos y condiciones de la membresía del Club
│   ├── equipo/index.html         índice del equipo (enlace en el pie de la portada): fotógrafos (Fiel) y sastres (Justo), fotos en images/Equipo/
│   └── web/index.html            Web · Lujo, Arte e Imagen: cuestionario de consultoría para miembros (css/web.css, js/web.js); se envía por el correo del visitante
├── terms.html                    términos de uso y derechos
├── 404.html                      página no encontrada (rutas incompletas y carpetas sin index; rutas absolutas)
├── CNAME                         casasiego.com (dominio de GitHub Pages)
├── fonts/                        Palacio (licencia; ver fonts/README.md) para «CASA» del logotipo
├── css/
│   ├── site.css                  tokens Casa Siego (blanco, beige antiguo, vino), logotipo, cabecera, menú lateral móvil
│   ├── layout.css                estructura, secciones sticky y parallax
│   └── brand.css                 componentes de marca: sesiones, precios, extras, locaciones, descargas
├── js/casa.js                    cabecera, menú lateral móvil animado, tonos de fondo por sección, barra de progreso
├── js/parallax.js · js/compare.js · js/protect.js
├── js/region.js                  bandera México / España (todas las páginas): por IP cambia CDMX → Madrid, las locaciones de Fiel y los precios a euros (MXN ÷ 20 × 1.8)
├── js/acceso.js · js/acceso-config.js · css/acceso.css   pop-up de acceso de la portada (Supabase Auth, sin registro)
├── brands/
│   ├── fiel/index.html           Fiel by Casa Siego · fotografía de mascotas (v1.2.3): «Reservar» → Payment Link del anticipo (España: correo)
│   ├── fiel/agenda/              v1.2.3 · noindex, robots: calendario interno tras el pago (Stripe → <sesión>/?pago=cs_…)
│   │   ├── calendario.json       reglas: semana actual 3 horarios, siguiente 9; 9:00 o 16:00; domingo 30 %, nunca sábado (js/agenda.js)
│   │   ├── ocupados.json         horarios confirmados, a mano al confirmar cada cita
│   │   └── esencial/ · clasica/ · legado/   generadas por docs/src/agenda-fiel.py (js/agenda.js, css/agenda.css)
│   ├── fiel/mascota/             redirige a fiel/ desde v1.2.3
│   ├── fiel/ejecutivo/ · fiel/familiar/   OCULTAS desde v1.2.3 (en desarrollo): noindex, sin enlaces, fuera del sitemap
│   ├── justo/index.html          marca nº 2 · Justo by Casa Siego, sastrería
│   ├── justo/tienda/             TIENDA EN LÍNEA de Justo (variante C/D: React + Tailwind por CDN, sin build)
│   │   ├── index.html            catálogo: 3 sacos, tallas CH · M · G · XG, calculadora de talla
│   │   ├── <slug>/index.html     ficha de cada saco (especificaciones y precio por talla, botón «Pagar con Stripe»)
│   │   ├── guia-de-tallas/       tallas del cuerpo, cómo medirse, medidas de cada saco
│   │   ├── db/                   datos simulados: productos.json · tallas.json · tienda.json (envíos, pagos, descuentos)
│   │   ├── js/tienda.jsx         capa db, precios por talla y ligas de Stripe, componentes (sin bolsa ni carrito) · js/tailwind.config.js
│   │   ├── css/tienda.css        identidad Casa Siego para Tailwind
│   │   └── supabase/             esquema Etapa 2 (no se ejecuta aún)
│   ├── libre/index.html          OCULTA desde v1.1.1: coworking y café; sin enlaces ni menú, fuera del sitemap, noindex
│   └── reino_fiel/index.html     RETIRADA en v1.2.0: redirige a fiel/ (enlaces antiguos)
├── images/
│   ├── README.md                 índice de catálogos
│   ├── casa/                     catálogo base de la portada (README.md)
│   └── og/share.jpg              tarjeta para compartir la portada
├── _interno/                     LOCAL, NO SE PUBLICA (.gitignore): documentación interna (tienda, SEO.md, docs/mockup/ synode-v1.0.x, docs/rebranding/ casasiego-v1.2.x, docs/cyberseguridad/ y SEO de Justo)
└── docs/                         documentación (bloqueada en .htaccess y robots.txt)
    ├── casasiego-v1.1.0.pdf      documentación del cambio de marca, dominio y DNS (único PDF en docs/)
    └── src/
        ├── build-pdf.sh          sh docs/src/build-pdf.sh 1.1.0 → docs/casasiego-v1.1.0.pdf
        ├── make-placeholders.py  marcadores para los huecos vacíos de todos los catálogos
        ├── export-portada-servicios.py  recortes web de la portada desde images/og/ (+ og/share.jpg)
        ├── ayuda.py              genera el Centro de Ayuda (ayuda/)
        └── agenda-fiel.py        genera las tres páginas de brands/fiel/agenda/
```

Los precios de Fiel deben coincidir en `brands/fiel/index.html`, `SESIONES` de `docs/src/agenda-fiel.py` y los montos de los Payment Links en Stripe (las páginas ocultas `ejecutivo/` y `familiar/` repiten los paquetes).

## Tienda Justo (`brands/justo/tienda/`)

Servir desde la raíz del sitio (`py -m http.server 8130` → http://localhost:8130/brands/justo/tienda/): la tienda lee
`db/*.json` con `fetch`, así que abrir el HTML con doble clic no funciona. Sacos, precios, medidas y existencias:
`brands/justo/tienda/db/`. Detalle, decisiones y pendientes: `_interno/tienda-justo.md` (solo local).

## Acceso a la portada

`index.html` abre con un pop-up de inicio de sesión (Supabase Auth, sin registro). Éxito: la tarjeta gira a «Encantados de
volvernos a encontrar» y abre la portada. Error: gira a «Esperamos tener el honor de conocerte pronto» y redirige a
`brands/fiel/`. «Omitir», en gris claro bajo el botón Entrar, lleva a `visitante.html`: copia de la portada sin pop-up (versión 1.0.0 «Unrecognized visitor», noindex). Los cambios a `index.html` deben copiarse ahí. Sin proyecto Supabase configurado (`js/acceso-config.js` vacío), todo intento es error. Las marcas, la
tienda y `404.html` no tienen pop-up. Es una barrera visual, no protección real del HTML: ver `_interno/acceso-casasiego.md`.

## Identidad Casa Siego® (v1.1.0)

- Logotipo: **CASA** en Palacio (archivos con licencia en `fonts/`; Cinzel lo sustituye mientras faltan) + **Siego** en Ledger
  Regular (Google Fonts) + **®** (marca registrada). Clases `.wordmark`, `.wordmark__casa`, `.wordmark__siego`, `.wordmark__r`.
- Colores: páginas blancas, bandas en beige antiguo `#EEE4D3` y vino `#6B1E2C` / `#4A1621`, texto `#3B1A1F`, latón `#B0905E`.
  Los nombres de variables de v1.0 (`--aegean-ink`, `--parchment-marble`…) se conservan y apuntan a los valores nuevos.
- Pies de página: «© 2026 Casa Siego®. Todos los derechos reservados.»
- Al cambiar CSS o JS, subir el `?v=` en las páginas que lo cargan (actual: site, layout, brand, parallax y casa.js 1.1.0).

## Dominio y DNS

DNS en Namecheap (`dns1/dns2.registrar-servers.com`). Estado verificado el 2026-10-17:

| Host | Tipo | Valor | Estado |
|---|---|---|---|
| `casasiego.com` | A | 185.199.108.153 · .109.153 · .110.153 · .111.153 | listo |
| `www` | CNAME | `eliav-mejia.github.io.` | listo (redirige a casasiego.com) |
| `casasiego.com` | AAAA | 2606:50c0:8000::153 · 8001::153 · 8002::153 · 8003::153 | **por añadir** (IPv6) |
| `_github-pages-challenge-eliav-mejia` | TXT | código de GitHub → Settings → Pages → Verified domains | **por añadir** |
| `casasiego.com` | MX / TXT (SPF) | reenvío de correo de Namecheap | listo; falta crear el reenvío `info@` |
| `synode.space` | — | redirección 301 a `https://casasiego.com` | **por hacer: hoy responde 404** |

GitHub → Settings → Pages: dominio personalizado `casasiego.com` (ya activo) y **Enforce HTTPS** (por activar).
Pasos completos, opciones de redirección de synode.space y lista de salida: `docs/casasiego-v1.1.0.pdf` §5–6 y `_interno/SEO.md`.
