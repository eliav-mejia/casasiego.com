# casasiego.com

Sitio de **Casa Siego®** (antes Synodé) y sus marcas: Fiel (retrato ejecutivo, familiar y de mascotas) y Justo (sastrería). Sitio estático en GitHub Pages, sin paso de build.

- Repositorio: <https://github.com/eliav-mejia/casasiego.com> (antes `eliav-mejia/synode.space`; GitHub redirige el nombre viejo)
- Dominio: <https://casasiego.com> (`CNAME`), `www` redirige al dominio raíz · correo público: `info@casasiego.com`
- Versión: **1.1.0 — cambio de marca** · documentación: `docs/casasiego-v1.1.0.pdf` (fuente `docs/src/casasiego-v1.1.0.html`)
- Última versión: **1.2.6 — traje personalizado con camisería a medida y constructor de trajes** · notas internas: `_interno/deployed/features/casasiego-v1.2.6.pdf` (`sh docs/src/build-pdf.sh interno-1.2.6`)
- Carpeta local: `lameyer.net-git-public/sites/casasiego.com/` (antes `sites/synode.space/`)

```
casasiego.com/
├── index.html                    portada Casa Siego (venta cruzada): Cap. I trajes (Justo), Cap. II mascotas (Fiel) · sin pop-up de enfoque desde v1.2.3
├── visitante.html                copia de la portada sin pop-up, destino de «Omitir»: Cap. I trajes (Justo), Cap. II mascotas (Fiel)
├── membresia/
│   ├── index.html                términos y condiciones de la membresía del Club
│   ├── equipo/index.html         índice del equipo (enlace en el pie de la portada): fotógrafos (Fiel) y sastres (Justo), fotos en images/Equipo/
│   └── web/index.html            Web · Lujo, Arte e Imagen: cuestionario de consultoría para miembros (css/web.css, js/web.js); se envía por el correo del visitante
├── cargando/                     pantallas de carga «Casa Siego» sobre papel vino, sin cabecera ni pie; noindex · ?a=/ruta/ continúa ahí
│   ├── index.html                las 7 variantes lado a lado
│   ├── cargando-1.html … -7.html  1 Kastemo · 2 Silhouette Phantom · 3 Gallery Dwiarna · 4 Helleny · 5 Hathem Bosteem · 6 Bethney Signature · 7 Breind Signature
│   └── fonts/                    sus fuentes, todas de uso personal: ver fonts/README.md antes de publicar
│                                 generado por docs/src/cargando.py
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
├── js/medicion.js                eventos para Google Tag Manager (GTM-WHTQ77F9) en todas las páginas públicas; ver «Medición»
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
│   ├── justo/tienda/             TIENDA de Justo (v1.4.1): sin precios, tallas ni pago; un «Cotizar» por pieza (motor compartido /js/tienda.js)
│   │   ├── index.html            catálogo: 3 sacos, 3 camisas, 3 corbatas; ficha de cada pieza en <dialog> (#slug)
│   │   ├── db/productos.json     base de datos limpia: id, slug, sku, kind, name, short, description, image, detalles
│   │   └── <slug>/ · guia-de-tallas/   direcciones antiguas: redirigen a index.html#slug (noindex)
│   ├── atemporal/index.html      Atemporal by Siego (antes Fijo, 2026-11-12): saco y traje para dama, misma información que justo/
│   ├── atemporal/tienda/         TIENDA de Atemporal by Siego (sacos para dama): misma estructura (index.html + db/productos.json)
│   └── libre/index.html          OCULTA desde v1.1.1: coworking y café; sin enlaces ni menú, fuera del sitemap, noindex
├── images/
│   ├── README.md                 índice de catálogos
│   ├── casa/                     catálogo base de la portada (README.md)
│   └── og/share.jpg              tarjeta para compartir la portada
├── _interno/                     LOCAL, NO SE PUBLICA (.gitignore): documentación interna: acceso/ (pop-up y Variante D), propuestas/ (v1.2.3 en adelante) y deployed/ (features, cyberseguridad, Marketing, protocolos, RRHH, SEO.md, tienda-justo.md)
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

## Medición (Google Tag Manager)

Contenedor **GTM-WHTQ77F9** en las 42 páginas públicas (todas menos `cargando/`, `docs/`):
el código estándar de Google justo después de `<meta charset>` y su `<noscript>` justo después de `<body>`, más
`js/medicion.js`. Las páginas generadas lo reciben de `docs/src/medicion.py` (lo importan `ayuda.py` y `agenda-fiel.py`):
al crear una página nueva a mano, copia los dos bloques de cualquier página y ajusta la ruta de `js/medicion.js`.

Eventos en `dataLayer` (todos llevan `marca`, `seccion` y `region`; nunca nombres, correos ni ids de pago):

| Evento | Cuándo | Datos |
|---|---|---|
| `casa_pagina` | cada página | `plantilla` (ruta) |
| `casa_region` | cambio México / España | — |
| `casa_pago_inicio` | clic en un Payment Link de Stripe | `producto`, `destino` |
| `casa_contacto` | clic en correo, teléfono o WhatsApp | `canal`, `asunto` |
| `casa_cta` | clic en un botón (`.button`, `.btn`) | `texto`, `destino` |
| `casa_salida` | clic a otro dominio | `destino` |
| `casa_formulario` | intento de envío de un formulario | `formulario` |
| `casa_acceso` | pop-up de la portada (`acceso.js`) | `paso`: exito · error · omitir |
| `casa_registro` | carta de registro (`registro.js`) | `paso` (los de la bitácora + registro_completo), `proveedor`, `modo` |
| `casa_agenda` | agenda de Fiel (`agenda.js`) | `paso`: anticipo_recibido · horario_elegido · solicitud_enviada, `sesion` |
| `casa_consultoria` | cuestionario Web (`web.js`) | `paso`: enviado |
| `casa_tienda_ver` | se abre la ficha de un producto (`tienda.js`, Justo y Atemporal) | `sku`, `producto`, `tipo`, `origen`: tarjeta · enlace |
| `casa_tienda_cotizar` | clic en «Cotizar» | `sku`, `producto`, `tipo`, `canal`: registro · whatsapp · correo, `sesion`, `origen`: tarjeta · ficha |
| `casa_tienda_filtro` | filtro de tipo en la tienda | `tipo` |

En GTM: una variable de capa de datos por cada dato, un activador «Evento personalizado» con `casa_.*` (regex) y una
etiqueta de evento de GA4 que use `{{Event}}` como nombre. GTM solo detecta la etiqueta cuando el sitio publicado
(rama `main`) la lleva.

## Tienda Justo (`brands/justo/tienda/`)

Servir desde la raíz del sitio (`py -m http.server 8130` → http://localhost:8130/brands/justo/tienda/): la tienda lee
`db/*.json` con `fetch`, así que abrir el HTML con doble clic no funciona. Sacos, precios, medidas y existencias:
`brands/justo/tienda/db/`. Detalle, decisiones y pendientes: `_interno/deployed/tienda-justo.md` (solo local).

## Acceso a la portada

`index.html` abre con un pop-up de inicio de sesión (Supabase Auth, sin registro). Éxito: la tarjeta gira a «Encantados de
volvernos a encontrar» y abre la portada. Error: gira a «Esperamos tener el honor de conocerte pronto» y redirige a
`brands/fiel/`. El pop-up solo aparece al llegar desde fuera del sitio (URL escrita, marcador, buscador) o con el avatar del menú (`#acceso`); «Inicio» y los enlaces internos llevan sin sesión a `visitante.html` y con sesión a la portada (casa.js 1.1.9, acceso.js 1.1.0). «Omitir», en gris claro bajo el botón Entrar, lleva a `visitante.html`: copia de la portada sin pop-up (versión 1.0.0 «Unrecognized visitor», noindex). Los cambios a `index.html` deben copiarse ahí. Sin proyecto Supabase configurado (`js/acceso-config.js` vacío), todo intento es error. Las marcas, la
tienda y `404.html` no tienen pop-up. Es una barrera visual, no protección real del HTML: ver `_interno/acceso/acceso-casasiego.md`.

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
Pasos completos, opciones de redirección de synode.space y lista de salida: `docs/casasiego-v1.1.0.pdf` §5–6 y `_interno/deployed/SEO.md`.
