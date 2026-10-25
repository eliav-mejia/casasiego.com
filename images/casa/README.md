# Catálogo base · Casa Siego (portada)

Imágenes de `index.html`. Estado a 2026-10-10: **foto** = fotografía definitiva, **marcador** = imagen provisional generada.

| Archivo | Lugar en la página | Formato | Tamaño de exportación (px) | Pie de foto / texto alternativo | Estado | Original |
|---|---|---|---|---|---|---|
| `portada.jpg` | Portada, detrás del título | Horizontal 3:2 | 2400 × 1600 (actual 1152 × 768) | — (decorativa) | foto | `og/1000028264.jpg` |
| `cowork-01.jpg` | Capítulo I · Coworking, lámina 01 | Vertical 5:7 | 1000 × 1400 (actual 548 × 767) | Barista sirviendo un capuchino | foto | `og/1000028263.jpg` |
| `cowork-02.jpg` | Capítulo I · Coworking, lámina 02 | Horizontal 3:2 | 1500 × 1000 (actual 848 × 565) | Barra con bancos y el estudio al fondo | foto | `og/1000028258.jpg` |
| `foto-estudio.jpg` | Capítulo II · Fotografía, hoja I | Horizontal 7:5 | 1400 × 1000 (actual 1075 × 768) | Estudio con ciclorama y luces | foto | `og/1000028265.jpg` |
| `foto-mascotas.jpg` | Capítulo II · Fotografía, hoja II | Horizontal 7:5 | 1400 × 1000 | Perro dorado bajo un árbol | foto | `og/Después_DSC1449.jpeg` |
| `foto-locacion.jpg` | Capítulo II · Fotografía, hoja III | Horizontal 7:5 | 1400 × 1000 | Perro moteado con pelota naranja | foto | `og/_DSC1540.JPG` |
| `interlude-servicios.jpg` | Banda de la cita | Horizontal 3:2 | 2400 × 1600 | — (decorativa) | foto | `og/_DSC1544.JPG` |
| `traje-01.jpg` | Capítulo III · Trajes, lámina 01 | Vertical 3:4 | 1200 × 1600 (actual 576 × 768) | Sacos en maniquíes y rack | foto | `og/1000028264.jpg` |
| `traje-02.jpg` | Capítulo III · Trajes, lámina 02 | Horizontal 9:7 | 1260 × 980 (actual 987 × 768) | Forro de saco de tweed, etiqueta Tailor's Blend | foto | `og/1000028262.jpg` |
| `traje-03.jpg` | Capítulo III · Trajes, lámina «Suma» | Horizontal 3:2 | 1500 × 1000 (actual 900 × 600) | Anaquel de café Tailor's Blend | foto | `og/1000028263.jpg` |
| `casa-reino-fiel.jpg` | Las casas · tarjeta Fiel | Horizontal 16:9 | 1600 × 900 | — (decorativa) | foto | `_DSC1861.JPG` |

Las fotos de `og/1000028258–65.jpg` miden 1408 × 768: se exportan a su tamaño real, sin ampliar. Para ganar nitidez, sustituye
por originales más grandes con el mismo nombre en `images/og/` y vuelve a ejecutar `python docs/src/export-portada-servicios.py`
(ese script guarda los recortes de cada imagen y también genera `images/og/share.jpg`).

Desde la v1.0.6 la portada ya no usa `hero.jpg`, `recorrido-*.jpg`, `interlude.jpg` ni `estudio-*.jpg`; se conservan como archivo.

Las imágenes `plate-01.jpg` … `plate-10.jpg` ya no se usan en la portada (v1.0.5); se conservan como archivo.
Los originales de cámara (`_DSC*`, `Antes_*`, `Después_*`, `Gemini_*`) viven en esta carpeta pero no se publican (ver `.gitignore`).

La tarjeta para compartir la portada es `images/og/share.jpg` (1200 × 630), recortada de `og/1000028264.jpg`.
Versión de caché de esta página: `?v=1.0.6` en `index.html`.
