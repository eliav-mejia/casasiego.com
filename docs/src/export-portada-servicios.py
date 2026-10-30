"""Web copies for the main page (v1.0.6, coworking · fotografía · sastrería) from the originals in images/og/.

Run from the project root:  python docs/src/export-portada-servicios.py
Crops are (x0, y0, x1, y1) in original pixels. Output never exceeds the source resolution (no upscaling).
Keeps copyright/artist, drops everything else (GPS included), per images/README.md.
"""
from PIL import Image, ImageOps

OG = "images/og/"
OUT = "images/casa/"
# output file, source, crop box, max width
JOBS = [
    ("portada.jpg",          "1000028264.jpg",        (128, 0, 1280, 768),      2400),  # 3:2 hero
    ("cowork-01.jpg",        "1000028263.jpg",        (860, 0, 1408, 767),      1000),  # 5:7 barra y barista
    ("cowork-02.jpg",        "1000028258.jpg",        (560, 203, 1408, 768),    1500),  # 3:2 barra, bancos, estudio al fondo
    ("foto-estudio.jpg",     "1000028265.jpg",        (166, 0, 1241, 768),      1400),  # 7:5 estudio
    ("foto-mascotas.jpg",    "Después_DSC1449.jpeg",  (680, 0, 4466, 2704),     1400),  # 7:5
    ("foto-locacion.jpg",    "_DSC1540.JPG",          (500, 0, 4286, 2704),     1400),  # 7:5
    ("interlude-servicios.jpg", "_DSC1544.JPG",       (372, 0, 4428, 2704),     2400),  # 3:2
    ("traje-01.jpg",         "1000028264.jpg",        (20, 0, 596, 768),        1200),  # 3:4 maniquíes y rack
    ("traje-02.jpg",         "1000028262.jpg",        (210, 0, 1197, 768),      1260),  # 9:7 saco de tweed
    ("traje-03.jpg",         "1000028263.jpg",        (0, 100, 900, 700),       1500),  # 3:2 anaquel Tailor's Blend
]
SHARE = ("images/casa/share.jpg", "1000028264.jpg", (0, 15, 1408, 754), 1200)  # 1200 × 630 card


def export(out, src, box, maxw, keep=(0x013B, 0x8298)):
    im = Image.open(OG + src)
    exif = im.getexif()
    im = ImageOps.exif_transpose(im).convert("RGB").crop(box)
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    clean = Image.Exif()
    for tag in keep:
        if exif.get(tag):
            clean[tag] = exif[tag]
    if not clean.get(0x8298):
        clean[0x8298] = "(c) 2026 Casa Siego. Todos los derechos reservados."
    im.save(out, "JPEG", quality=80, optimize=True, progressive=True, exif=clean.tobytes())
    print(f"{out}  {im.width} x {im.height}")


if __name__ == "__main__":
    for out, src, box, maxw in JOBS:
        export(OUT + out, src, box, maxw)
    out, src, box, maxw = SHARE
    export(out, src, box, maxw)
