# SEO — synode.space

Guía de referencia: `builds/seo/seo-guide.pdf` (estructura HTML, meta etiquetas, H1–H3, nav + ul, alt de imágenes).
Este documento resume cómo se aplica en synode.space. Actualizado 2026-10-16.

## Estrategia

Synodé es una casa en Roma Norte, Ciudad de México, con tres marcas. Cada marca tiene su página y posiciona por su
servicio; la portada vende el conjunto.

| Sección | Público | Búsquedas objetivo |
|---|---|---|
| Portada `/` | CDMX: freelancers, parejas, empresas | coworking con café, estudio fotográfico, trajes a medida CDMX |
| `/brands/fiel/`, `/brands/reino_fiel/` | Dueños de mascotas | fotografía de mascotas CDMX, sesión con luz natural |
| `/brands/justo/` y `/tienda/` | Hombres que buscan traje | sastrería a medida Roma Norte, sacos, guía de tallas |
| `/brands/libre/` | Freelancers y equipos | coworking Roma Norte, café de especialidad |
| `/brands/fiel/blog/` | Clientes de Fiel | cómo organizar una sesión de fotos |

Las fotografías son el contenido principal: `alt` descriptivo en cada una. El sitio pide no usarlas para entrenar IA
(`robots.txt`, `noai`, `tdm-reservation`), sin bloquear a los buscadores.

## Reglas para cada página

1. `<html lang="es-MX">` (`terms.html` en inglés: `lang="en"`), `charset`, `viewport`.
2. `<title>` de **50–60 caracteres** y `<meta name="description">` de **150–160**, únicos.
3. `<link rel="canonical">` absoluta `https://synode.space/...`.
4. Open Graph (`og:image` 1200 × 630, `share.jpg` por defecto) + `twitter:card`.
5. JSON-LD en el `<head>`.
6. Un solo `<h1>`; `<h2>` por sección, `<h3>` dentro.
7. Enlaces del pie como `<nav class="colophon__nav">` + `<ul class="inline-list">` (se ven en una línea con `·`).
   En la tienda Justo, menús y migas como `<nav>` + `<ul>`/`<ol>`.
8. Cada `<img>` con `alt` y `width`/`height` reales del archivo (la regla `img { height: auto }` mantiene la proporción).
9. Al cambiar CSS o JS, subir el `?v=` en las páginas que lo cargan.
10. `visitante.html`, `bolsa/` y 404: `noindex`, fuera del sitemap.

## Etiquetas usadas

| Tipo de página | og:type | twitter:card | JSON-LD |
|---|---|---|---|
| Portada | website | summary_large_image | `Organization` (dirección CDMX, email, marcas) + `WebSite` |
| Marcas Fiel, Justo, Libre | website | summary_large_image | `Organization` con `parentOrganization` Synodé + `BreadcrumbList` |
| Reino Fiel, términos, tienda, guía de tallas | website | summary_large_image | `BreadcrumbList` |
| Blog de Fiel | article | summary_large_image | `BreadcrumbList` |
| Saco (ficha) | product | summary_large_image | `Product` (ya existente) |

Comunes: `og:site_name` = Synodé, `og:locale` = es_MX (en_US en `terms.html`).
La tienda Justo es React: `<div id="root">` lleva un `<noscript>` con `<h1>`, resumen y enlaces.

## Archivos de rastreo

- `robots.txt`: bloquea crawlers de IA y `/docs/`; anuncia el sitemap.
- `sitemap.xml`: lista a mano (13 URLs). Añade cada página pública nueva.

Tras publicar: enviar `https://synode.space/sitemap.xml` en Google Search Console.

## Pendiente

- La portada está detrás del pop-up de acceso (Supabase) y sin JavaScript redirige a `/brands/fiel/`:
  los buscadores pueden no ver su contenido. `visitante.html` es la copia sin pop-up, pero es `noindex`.
- Las imágenes de `images/brands/reino_fiel/` (incluida `compartir.jpg`) están borradas en la copia local:
  `/brands/reino_fiel/` muestra imágenes rotas. Restaurar con `git restore images/brands/reino_fiel`.
- Las fotos JPG originales pesan 2–6 MB: exportar versiones WebP de menos de 300 KB mejora la velocidad (LCP).
