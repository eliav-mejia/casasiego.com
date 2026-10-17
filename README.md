# casasiego.com

Volumen fotográfico de Casa Siego y sus marcas. Sitio estático (GitHub Pages), sin paso de build.

```
casasiego.com/
├── index.html                    portada Casa Siego (venta cruzada): Cap. I coworking (Coffee Space), Cap. II fotografía (Reino Fiel), Cap. III trajes (Toriku Films)
├── visitante.html                copia de la portada sin pop-up, destino de «Omitir» (v1.0.0 «Unrecognized visitor»)
├── terms.html                    términos de uso y derechos
├── 404.html                      página no encontrada (rutas incompletas y carpetas sin index; rutas absolutas)
├── css/
│   ├── site.css                  tokens, tipografía y componentes base
│   ├── layout.css                estructura, secciones sticky y parallax
│   └── brand.css                 componentes de marca: sesiones, precios, extras, locaciones, descargas
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
└── docs/                         documentación privada (bloqueada en .htaccess y robots.txt)
    └── src/
        ├── build-pdf.sh          sh docs/src/build-pdf.sh reino-fiel-sesiones  → guía PDF de la marca
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
tienda y `404.html` no tienen pop-up. Es una barrera visual, no protección real del HTML: ver `_interno/acceso-synode.md`.
