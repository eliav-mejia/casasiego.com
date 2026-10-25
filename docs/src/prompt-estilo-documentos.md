# Prompt — Estilo CSS de los documentos anexos de Casa Siego

Pega este prompt al pedir una carta, presentación, cotización o plan ejecutivo de Casa Siego (o de sus marcas Fiel, Justo, Libre). Resume el sistema de [css/site.css](../../css/site.css), [css/brand.css](../../css/brand.css) y los PDFs de [docs/src/](.) adaptado a impresión.

---

## Prompt

> Diseña el documento como **un solo archivo HTML autocontenido** que se imprime a PDF con Chrome headless (`sh docs/src/build-pdf.sh <nombre>`). Estilo **"Hellenic Manuscript & Classical Serif"** de Casa Siego: sobrio, editorial, de manuscrito clásico; mucho margen, filetes dorados finos, capitulares en óxido. Nada de sombras, degradados, esquinas redondeadas, iconos de UI ni emojis. Idioma: español de México; precios en MXN.
>
> **Paleta (60 / 30 / 10)** — declárala en `:root` y no inventes otros colores:
> - `--parch #F7F4EE` Parchment Marble — 60 %, fondo de pantalla (en impresión el fondo es `#FFFFFF`).
> - `--ink #0C1821` Aegean Ink — 30 %, texto y portadas oscuras.
> - `--rust #A34828` Amphora Rust — 10 %, capitulares, eyebrows, cifras clave, acentos.
> - `--gold #C29B38` Hellenic Gold — filetes y ornamentos; como texto **solo sobre tinta** (6.9:1), nunca sobre pergamino (2.4:1).
> - `--laurel #516053` Laurel Leaf — notas, pies, encabezados de tabla, texto secundario.
> - `--white #FFFFFF` Thera White — tarjetas y recuadros.
> - Filetes: `1px solid rgba(194,155,56,.4)`; filas de tabla `rgba(194,155,56,.3)`.
>
> **Tipografía** (Google Fonts, `display=block` para que el PDF no salga con fuentes de sistema):
> `Bodoni+Moda:opsz,wght@6..96,600 · Cinzel:wght@400;700;900 · Cinzel+Decorative:wght@700 · EB+Garamond:ital,wght@0,400;0,600;1,400 · GFS+Didot · Spectral:ital@1`
> - **H1 / marca** — Cinzel 900, MAYÚSCULAS, `letter-spacing:.15em`, 34pt en portada.
> - **H2 / sección** — Bodoni Moda 600, 20pt, `letter-spacing:.02em`, filete dorado arriba (`border-top` + `padding-top:10pt`).
> - **H3 / subsección** — Cinzel 400, 11pt, MAYÚSCULAS, `letter-spacing:.2em`.
> - **Cuerpo** — EB Garamond 11pt / 1.6, cifras de estilo antiguo (`font-feature-settings:"onum" 1`), medida máx. 62ch.
> - **Eyebrow** — Cinzel 8pt, `letter-spacing:.3em`, mayúsculas, color óxido (dorado sobre tinta).
> - **Meta / pies / fechas** — Spectral itálica 9.5pt, color laurel.
> - **Griego** (Συνέδριον, lema) — GFS Didot, dorado, solo en portada.
> - **Capitular** — `.dropcap::first-letter`: Cinzel Decorative 700, 40pt, línea .8, óxido, `float:left`. Una por documento (primer párrafo).
> - **Cifras y precios** — Bodoni Moda 600; en tablas `font-variant-numeric: tabular-nums` (anula `onum`) y alineadas a la derecha.
>
> **Página e impresión**
> - Documentos verticales: `@page { size: A4; margin: 20mm 22mm 22mm 28mm; }` (margen izquierdo mayor, de encuadernación). Carta (`size: letter`) solo si el cliente lo pide.
> - Presentaciones: `@page { size: 13.333in 7.5in; margin: 0; }`, cada diapositiva `section.slide { width:13.333in; height:7.5in; break-after:page; overflow:hidden; padding:.8in 1in; }`.
> - `html { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`; `@media print { body { background:#FFF } }`.
> - `h1,h2,h3 { break-after: avoid }`; tablas, notas y tarjetas con `break-inside: avoid`.
>
> **Componentes comunes**
> - `.cover` — portada a página completa (`height:297mm`, `@page :first { margin:0 }`), fondo tinta, texto pergamino: eyebrow dorado → H1 → griego → lede en Spectral itálica 14pt → filete corto dorado de 60pt → meta dorada (fecha, versión, destinatario).
> - `.note` — `border-left:2px solid var(--rust)`, fondo `rgba(255,255,255,.6)`, para condiciones o advertencias.
> - Tablas — `th` en Cinzel 7.5pt, `letter-spacing:.18em`, mayúsculas, laurel, `border-bottom:1px solid var(--gold)`; `td` con filete dorado al 30 %; sin rayado de filas ni fondos de color.
> - Listas — viñetas sencillas; en listas numeradas el `::marker` va en Cinzel dorado (sobre tinta) u óxido (sobre pergamino).
> - Filete `.rule` — `border-top:1px solid var(--gold); opacity:.4`; versión corta de 4.5rem para separar bloques.
> - Fotografías (si las hay) — tonificadas con `filter: saturate(.82) sepia(.12) contrast(1.04)`, sin bordes redondeados.
>
> **Por tipo de documento**
> 1. **Carta** — sin portada. Membrete: "CASA SIEGO" en Cinzel 900 con eyebrow de la marca (p. ej. "FIEL BY CASA SIEGO") y filete dorado completo debajo. Bloque de lugar y fecha en Spectral itálica a la derecha; destinatario en EB Garamond; saludo, cuerpo con capitular en el primer párrafo, despedida. Firma: nombre en Cinzel 11pt con tracking .2em, cargo en meta laurel. Pie con datos de contacto en meta 8.5pt separados por "·". Una página idealmente.
> 2. **Presentación** — 16:9. Portada y diapositivas de cierre/sección en tinta; diapositivas de contenido en pergamino. Cada diapositiva: eyebrow con número romano de capítulo ("CAP. II · FOTOGRAFÍA"), un titular Bodoni Moda 32–40pt, máximo 3–5 ideas. Cifras grandes en Bodoni Moda 60pt+ óxido con etiqueta Cinzel debajo. Folio (nº de diapositiva) en Cinzel 8pt dorado, esquina inferior derecha.
> 3. **Cotización** — portada opcional (sí si va a un cliente corporativo). Encabezado con folio ("COTIZACIÓN Nº S-2026-014"), fecha, vigencia y cliente en una rejilla de dos columnas con etiquetas Cinzel laurel. Tabla de conceptos: Concepto · Cantidad · Precio unitario · Importe; montos con `tabular-nums` alineados a la derecha, formato `$4,500 MXN`. Totales en bloque a la derecha: subtotal, IVA 16 %, **total** en Bodoni Moda 600 18pt óxido con filete dorado arriba. Paquetes destacados como tarjetas blancas con borde dorado al 40 % y `border-top:3px solid var(--rust)` en el recomendado. Condiciones (anticipo, entrega, cancelación) en `.note`. Firma de aceptación al final.
> 4. **Plan ejecutivo** — portada en tinta. Página 2: resumen ejecutivo (capitular + 3–5 puntos clave + recuadro de cifras: `.score` con etiqueta a la izquierda y valor Bodoni óxido a la derecha). Luego secciones numeradas en romanos (I. Contexto · II. Objetivos · III. Estrategia · IV. Cronograma · V. Inversión · VI. Riesgos · VII. Siguientes pasos). Cronograma como tabla o barras SVG en dorado/óxido/laurel sobre filetes. Gráficas en SVG inline, texto EB Garamond 10px laurel, sin cuadrícula densa. Cada sección abre en página nueva solo si supera media página.
>
> **No hacer:** colores fuera de la paleta, sans-serif, negritas en párrafos completos, dorado como texto sobre fondo claro, más de una capitular por página, sombras, `border-radius`, iconos, tablas con fondos de color, texto justificado sin `hyphens:auto`.

---

## CSS base (copiar en el `<style>` de cada documento)

```css
@page { size: A4; margin: 20mm 22mm 22mm 28mm; }
@page :first { margin: 0; }            /* quitar si no hay portada */
:root { --ink:#0C1821; --parch:#F7F4EE; --rust:#A34828; --gold:#C29B38; --laurel:#516053; --white:#FFFFFF; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; background:var(--parch); color:var(--ink); font:11pt/1.6 "EB Garamond", Georgia, serif; font-feature-settings:"onum" 1; }
h1,h2,h3 { break-after: avoid; }
h1 { font:900 34pt/1 "Cinzel", serif; letter-spacing:.15em; text-transform:uppercase; margin:0; }
h2 { font:600 20pt/1.2 "Bodoni Moda", serif; letter-spacing:.02em; margin:28pt 0 8pt; padding-top:10pt; border-top:1px solid rgba(194,155,56,.4); }
h3 { font:400 11pt/1.3 "Cinzel", serif; letter-spacing:.2em; text-transform:uppercase; margin:16pt 0 6pt; }
p { margin:0 0 8pt; max-width:62ch; }
.eyebrow { font:400 8pt "Cinzel", serif; letter-spacing:.3em; text-transform:uppercase; color:var(--rust); margin-bottom:8pt; }
.meta { font:italic 9.5pt/1.5 "Spectral", serif; color:var(--laurel); }
.dropcap::first-letter { float:left; font:700 40pt/.8 "Cinzel Decorative", serif; color:var(--rust); padding:4pt 5pt 0 0; }
.rule { border:0; border-top:1px solid var(--gold); opacity:.4; margin:18pt 0; }
.rule--short { width:60pt; opacity:.6; }
table { width:100%; border-collapse:collapse; margin:6pt 0 12pt; font-size:9.5pt; break-inside:avoid; }
th { font:400 7.5pt "Cinzel", serif; letter-spacing:.18em; text-transform:uppercase; text-align:left; color:var(--laurel); border-bottom:1px solid var(--gold); padding:4pt 6pt; }
td { border-bottom:1px solid rgba(194,155,56,.3); padding:4pt 6pt; vertical-align:top; }
.num { text-align:right; font-variant-numeric: tabular-nums lining-nums; white-space:nowrap; }
.total { font:600 18pt "Bodoni Moda", serif; color:var(--rust); border-top:1px solid var(--gold); padding-top:6pt; text-align:right; }
.note { border-left:2px solid var(--rust); padding:4pt 0 4pt 10pt; margin:8pt 0 12pt; background:rgba(255,255,255,.6); break-inside:avoid; }
.card { background:var(--white); border:1px solid rgba(194,155,56,.4); padding:14pt; break-inside:avoid; }
.card--featured { border-top:3px solid var(--rust); }
.cover { height:297mm; display:flex; flex-direction:column; justify-content:space-between; background:var(--ink); color:var(--parch); padding:40mm 22mm 30mm 28mm; break-after:page; overflow:hidden; }
.cover .eyebrow, .cover .meta { color:var(--gold); }
.cover .greek { font:20pt "GFS Didot", serif; color:var(--gold); letter-spacing:.08em; margin-top:10pt; }
.cover .lede { font:italic 14pt "Spectral", serif; margin-top:16pt; opacity:.9; }
@media print { body { background:#FFFFFF; } }
```
