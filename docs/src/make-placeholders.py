"""Casa Siego v1.0.4 — writes labelled placeholder JPGs for every slot in the image catalogues.

Catalogues: images/casa/README.md (main page) and images/brands/<brand>/README.md (one per brand).

Run from the project root:  python docs/src/make-placeholders.py
Existing files are never overwritten unless --force is passed, so your own photographs are safe.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

# filename, width, height, label  — keep in sync with images/casa/README.md and images/brands/*/README.md
CATALOGUE = [
    ("images/casa/hero.jpg",                2400, 1600, "Hero"),
    # v1.2.4: recorrido-cafe/-sastreria, estudio-* and casa-reino-fiel were deleted; no placeholders for them
    ("images/casa/recorrido-estudio.jpg",   1400, 1000, "Fiel · El estudio"),
    ("images/casa/interlude.jpg",           2400, 1600, "Interlude"),
    # v1.0.6 · coworking, fotografía y trajes (exportados con docs/src/export-portada-servicios.py)
    ("images/casa/portada.jpg",             2400, 1600, "Portada"),
    ("images/casa/cowork-01.jpg",           1000, 1400, "Coworking 01"),
    ("images/casa/cowork-02.jpg",           1500, 1000, "Coworking 02"),
    ("images/casa/foto-estudio.jpg",        1400, 1000, "Fotografía · Estudio"),
    ("images/casa/foto-mascotas.jpg",       1400, 1000, "Fotografía · Mascotas"),
    ("images/casa/foto-locacion.jpg",       1400, 1000, "Fotografía · Locación"),
    ("images/casa/interlude-servicios.jpg", 2400, 1600, "Interludio"),
    ("images/casa/traje-01.jpg",            1200, 1600, "Traje 01"),
    ("images/casa/traje-02.jpg",            1260,  980, "Traje 02"),
    ("images/casa/traje-03.jpg",            1500, 1000, "Traje 03"),
    ("images/casa/share.jpg",         1200,  630, "Social share image"),

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
    d.text((cx, cy + s * 0.10), (f"{w} × {h} px — sustituir por tu fotografía" if "/brands/" in path or "/casa/" in path else f"{w} × {h} px — replace with your photograph"), font=font(int(s * 0.028), italic=True), fill=PARCH, anchor="mm")
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
