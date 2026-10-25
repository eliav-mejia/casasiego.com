"""Packs PNG files into a .ico (PNG-compressed entries, Windows Vista+ and every browser).
Usage: python3 ico.py out.ico a.png b.png ..."""
import struct, sys

out, pngs = sys.argv[1], [open(p, 'rb').read() for p in sys.argv[2:]]
head = struct.pack('<HHH', 0, 1, len(pngs))
offset, entries = 6 + 16 * len(pngs), b''
for data in pngs:
    w, h = struct.unpack('>II', data[16:24])   # IHDR width/height
    entries += struct.pack('<BBBBHHII', w % 256, h % 256, 0, 0, 1, 32, len(data), offset)
    offset += len(data)
open(out, 'wb').write(head + entries + b''.join(pngs))
print('Wrote', out)
