"""Synode v1.0.4 — writes labelled placeholder JPGs for every slot in the image catalogues.

Catalogues: images/synodos/README.md (main page) and images/brands/<brand>/README.md (one per brand).

Run from the project root:  python docs/src/make-placeholders.py
Existing files are never overwritten unless --force is passed, so your own photographs are safe.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

# filename, width, height, label  — keep in sync with images/synodos/README.md and images/brands/*/README.md
CATALOGUE = [
    ("images/synodos/hero.jpg",                2400, 1600, "Hero"),
    ("images/synodos/recorrido-cafe.jpg",      1400, 1000, "Coffee Space · La barra"),
    ("images/synodos/recorrido-sastreria.jpg", 1400, 1000, "Toriku Films · La prueba"),
    ("images/synodos/recorrido-estudio.jpg",   1400, 1000, "Reino Fiel · El estudio"),
    ("images/synodos/interlude.jpg",           2400, 1600, "Interlude"),
    ("images/synodos/estudio-01.jpg",          1000, 1400, "Estudio 01"),
    ("images/synodos/estudio-02.jpg",          1000, 1200, "Estudio 02"),
    ("images/synodos/estudio-antes.jpg",       1500, 1000, "Estudio · Antes"),
    ("images/synodos/estudio-despues.jpg",     1500, 1000, "Estudio · Después"),
    ("images/synodos/casa-reino-fiel.jpg",     1600,  900, "Casa · Reino Fiel"),
    # v1.0.6 · coworking, fotografía y trajes (exportados con docs/src/export-portada-servicios.py)
    ("images/synodos/portada.jpg",             2400, 1600, "Portada"),
    ("images/synodos/cowork-01.jpg",           1000, 1400, "Coworking 01"),
    ("images/synodos/cowork-02.jpg",           1500, 1000, "Coworking 02"),
    ("images/synodos/foto-estudio.jpg",        1400, 1000, "Fotografía · Estudio"),
    ("images/synodos/foto-mascotas.jpg",       1400, 1000, "Fotografía · Mascotas"),
    ("images/synodos/foto-locacion.jpg",       1400, 1000, "Fotografía · Locación"),
    ("images/synodos/interlude-servicios.jpg", 2400, 1600, "Interludio"),
    ("images/synodos/traje-01.jpg",            1200, 1600, "Traje 01"),
    ("images/synodos/traje-02.jpg",            1260,  980, "Traje 02"),
    ("images/synodos/traje-03.jpg",            1500, 1000, "Traje 03"),
    ("images/og/share.jpg",         1200,  630, "Social share image"),

    # Brand no. 1 · Reino Fiel (brands/reino_fiel/)
    ("images/brands/reino_fiel/hero.jpg",            2400, 1600, "Reino Fiel · Portada"),
    ("images/brands/reino_fiel/retrato-01.jpg",      1000, 1400, "Retrato 01"),
    ("images/brands/reino_fiel/retrato-02.jpg",      1000, 1200, "Retrato 02"),
    ("images/brands/reino_fiel/retrato-03.jpg",      1500, 1000, "Retrato 03"),
    ("images/brands/reino_fiel/interludio.jpg",      2400, 1600, "Reino Fiel · Interludio"),
    ("images/brands/reino_fiel/sesion-esencial.jpg", 1200,  900, "Sesión Esencial"),
    ("images/brands/reino_fiel/sesion-clasica.jpg",  1200,  900, "Sesión Clásica"),
    ("images/brands/reino_fiel/sesion-legado.jpg",   1200,  900, "Sesión Legado"),
    ("images/brands/reino_fiel/galeria-01.jpg",      1200, 1600, "Galería 01"),
    ("images/brands/reino_fiel/galeria-02.jpg",      1260,  980, "Galería 02"),
    ("images/brands/reino_fiel/galeria-03.jpg",      1080, 1560, "Galería 03"),
    ("images/brands/reino_fiel/galeria-04.jpg",      1500, 1000, "Galería 04"),
    ("images/brands/reino_fiel/compartir.jpg",       1200,  630, "Reino Fiel · Compartir"),
]

INK, PARCH, GOLD, RUST = (12, 24, 33), (247, 244, 238), (194, 155, 56), (163, 72, 40)


def font(size, italic=False):
    names = ["georgiai.ttf" if italic else "georgia.ttf", "DejaVuSerif.ttf"]
    for n in names:
        for d in ["C:/Windows/Fonts", "/Library/Fonts", "/usr/share/fonts/truetype/dejavu"]:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def make(path, w, h, label):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img)
    # soft vertical tone so the parallax movement is visible
    for y in range(h):
        t = y / h
        c = tuple(int(INK[i] + (60 - INK[i] * 0.4) * t * 0.5) for i in range(3))
        d.line([(0, y), (w, y)], fill=c)
    m = int(min(w, h) * 0.06)
    d.rectangle([m, m, w - m, h - m], outline=GOLD, width=max(2, w // 900))
    cx, cy = w // 2, h // 2
    s = min(w, h)
    d.text((cx, cy - s * 0.09), label.upper(), font=font(int(s * 0.055)), fill=PARCH, anchor="mm")
    d.line([(cx - s * 0.06, cy - s * 0.02), (cx + s * 0.06, cy - s * 0.02)], fill=RUST, width=max(2, s // 400))
    d.text((cx, cy + s * 0.04), path, font=font(int(s * 0.035), italic=True), fill=GOLD, anchor="mm")
    d.text((cx, cy + s * 0.10), (f"{w} × {h} px — sustituir por tu fotografía" if "/brands/" in path or "/synodos/" in path else f"{w} × {h} px — replace with your photograph"), font=font(int(s * 0.028), italic=True), fill=PARCH, anchor="mm")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "JPEG", quality=82, optimize=True, progressive=True)


if __name__ == "__main__":
    force = "--force" in sys.argv
    for path, w, h, label in CATALOGUE:
        if os.path.exists(path) and not force:
            print("keep ", path)
            continue
        make(path, w, h, label)
        print("wrote", path)
