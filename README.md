# synode.space

Volumen fotográfico de Synodé y sus marcas. Sitio estático (GitHub Pages), sin paso de build.

```
synode.space/
├── index.html                    portada Synodé (venta cruzada): Cap. I coworking (Coffee Space), Cap. II fotografía (Reino Fiel), Cap. III trajes (Toriku Films)
├── terms.html                    términos de uso y derechos
├── css/
│   ├── site.css                  tokens, tipografía y componentes base
│   ├── layout.css                estructura, secciones sticky y parallax
│   └── brand.css                 componentes de marca: sesiones, precios, extras, locaciones, descargas
├── js/parallax.js · js/compare.js · js/protect.js
├── brands/
│   ├── fiel/index.html           marca nº 1 · Fiel by Synodé, estudio fotográfico
│   ├── justo/index.html          marca nº 2 · Justo by Synodé, sastrería
│   ├── libre/index.html          marca nº 3 · Libre by Synodé, coworking y café
│   └── reino_fiel/               marca nº 1 · fotografía de mascotas (español, precios en MXN)
│       ├── index.html
│       └── descargas/reino-fiel-guia-de-sesiones.pdf
├── images/
│   ├── README.md                 índice de catálogos
│   ├── synodos/                  catálogo base de la portada (README.md)
│   ├── brands/reino_fiel/        catálogo de la marca nº 1 (README.md)
│   └── og/share.jpg              tarjeta para compartir la portada
└── docs/                         documentación privada (bloqueada en .htaccess y robots.txt)
    └── src/
        ├── build-pdf.sh          sh docs/src/build-pdf.sh reino-fiel-sesiones  → guía PDF de la marca
        ├── make-placeholders.py  marcadores para los huecos vacíos de todos los catálogos
        ├── export-portada-servicios.py  recortes web de la portada desde images/og/ (+ og/share.jpg)
        └── reino-fiel-sesiones.html  fuente de la guía PDF
```

Los precios de Reino Fiel están en dos lugares que deben coincidir: la sección «Sesiones» de `brands/reino_fiel/index.html`
y `docs/src/reino-fiel-sesiones.html`. Tras cambiarlos, vuelve a generar el PDF.
