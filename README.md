# casasiego.com

Sitio de **Casa Siego®** (antes Synodé) y sus marcas: Fiel, Justo y Libre. Sitio estático en GitHub Pages, sin paso de build.

- Repositorio: <https://github.com/eliav-mejia/casasiego.com> (antes `eliav-mejia/synode.space`; GitHub redirige el nombre viejo)
- Dominio: <https://casasiego.com> (`CNAME`), `www` redirige al dominio raíz · correo público: `info@casasiego.com`
- Versión: **1.1.0 — cambio de marca** · documentación: `docs/casasiego-v1.1.0.pdf` (fuente `docs/src/casasiego-v1.1.0.html`)
- Carpeta local: `Meyer/sites/casasiego.com/` (antes `sites/synode.space/`)

```
casasiego.com/
├── index.html                    portada Casa Siego (venta cruzada): Cap. I coworking (Coffee Space), Cap. II fotografía (Reino Fiel), Cap. III trajes (Toriku Films)
├── visitante.html                copia de la portada sin pop-up, destino de «Omitir» (v1.0.0 «Unrecognized visitor»)
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
│   ├── fiel/index.html           marca nº 1 · Fiel by Casa Siego, estudio fotográfico
│   ├── justo/index.html          marca nº 2 · Justo by Casa Siego, sastrería
│   ├── justo/tienda/             TIENDA EN LÍNEA de Justo (variante C/D: React + Tailwind por CDN, sin build)
│   │   ├── index.html            catálogo: 3 sacos, tallas CH · M · G · XG, calculadora de talla
│   │   ├── <slug>/index.html     ficha de cada saco (especificaciones por talla, monograma, añadir a la bolsa)
│   │   ├── bolsa/                bolsa + entrega + pago + datos → pedido por correo (noindex)
│   │   ├── guia-de-tallas/       tallas del cuerpo, cómo medirse, medidas de cada saco
│   │   ├── db/                   datos simulados: productos.json · tallas.json · tienda.json (envíos, pagos, descuentos)
│   │   ├── js/tienda.jsx         capa db, bolsa (localStorage), priceBag, componentes · js/tailwind.config.js
│   │   ├── css/tienda.css        identidad Casa Siego para Tailwind
│   │   └── supabase/             esquema Etapa 2 (no se ejecuta aún)
│   ├── libre/index.html          marca nº 3 · Libre by Casa Siego, coworking y café
│   └── reino_fiel/               marca nº 1 · fotografía de mascotas (español, precios en MXN)
│       ├── index.html
│       └── descargas/reino-fiel-guia-de-sesiones.pdf
├── images/
│   ├── README.md                 índice de catálogos
│   ├── casa/                     catálogo base de la portada (README.md)
│   ├── brands/reino_fiel/        catálogo de la marca nº 1 (README.md)
│   └── og/share.jpg              tarjeta para compartir la portada
├── _interno/                     LOCAL, NO SE PUBLICA (.gitignore): documentación interna de la tienda
└── docs/                         documentación (bloqueada en .htaccess y robots.txt)
    ├── casasiego-v1.1.0.pdf      documentación del cambio de marca, dominio y DNS (versión actual)
    ├── casa-siego-prelanzamiento.pdf  nota pública y discreta del cambio de nombre (sin enlaces en el sitio)
    ├── synode-v1.0.x.pdf         versiones anteriores, con el nombre Synodé
    └── src/
        ├── build-pdf.sh          sh docs/src/build-pdf.sh 1.1.0 → docs/casasiego-v1.1.0.pdf · reino-fiel-sesiones → guía PDF de la marca
        ├── make-placeholders.py  marcadores para los huecos vacíos de todos los catálogos
        ├── export-portada-servicios.py  recortes web de la portada desde images/og/ (+ og/share.jpg)
        └── reino-fiel-sesiones.html  fuente de la guía PDF
```

Los precios de Reino Fiel están en dos lugares que deben coincidir: la sección «Sesiones» de `brands/reino_fiel/index.html`
y `docs/src/reino-fiel-sesiones.html`. Tras cambiarlos, vuelve a generar el PDF.

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
Pasos completos, opciones de redirección de synode.space y lista de salida: `docs/casasiego-v1.1.0.pdf` §5–6 y `SEO.md`.
