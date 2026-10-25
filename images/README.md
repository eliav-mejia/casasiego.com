# Casa Siego · catálogos de imágenes (v1.0.5)

Cada página tiene su propia carpeta de imágenes y su propio catálogo. Sustituye los archivos usando **exactamente** el nombre del catálogo:
las páginas los recogen sin cambiar código.

| Carpeta | Página | Catálogo |
|---|---|---|
| `images/casa/` | Portada, `index.html` (catálogo base Casa Siego) | [`casa/README.md`](casa/README.md) |
| `images/og/share.jpg` | Tarjeta al compartir la portada (1200 × 630) | — |

`images/og/` guarda además los originales de cámara; no se publican (ver `.gitignore`).

## Una marca nueva

1. Crea `images/brands/<marca>/` y copia `casa/README.md` como plantilla de catálogo.
2. Añade sus huecos a `CATALOGUE` en `docs/src/make-placeholders.py` y ejecútalo para crear marcadores.
3. Copia `brands/fiel/` en `brands/<marca>/` y cambia las rutas de sus imágenes.

## Antes de subir fotografías

1. **Solo copias web.** JPEG, sRGB, calidad 75–82, al tamaño del catálogo. Nunca los originales.
2. **Conserva el copyright, quita la ubicación.** Lightroom: *Metadatos → Todo excepto info de cámara y Camera Raw*, marca *Quitar información de ubicación*.
3. **Nombre exacto**, en minúsculas y `.jpg`.
4. En el `index.html` correspondiente, actualiza el `alt="…"` y el pie de foto de esa imagen.
5. Sube el número `?v=` de esa página (p. ej. `?v=1.0.4` → `?v=1.0.5`) para que los navegadores no muestren la copia en caché.

Otras proporciones funcionan: el marco recorta desde el centro. Para mover el recorte añade `style="object-position: 50% 25%"` al `<img>`.
Para regenerar marcadores en huecos vacíos: `python docs/src/make-placeholders.py` (nunca sobrescribe tus fotos).
