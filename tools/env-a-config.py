#!/usr/bin/env python3
"""Casa Siego · .env → js/supabase-config.js (solo valores PÚBLICOS).

    python3 tools/env-a-config.py            escribe js/supabase-config.js
    python3 tools/env-a-config.py --check    sale 1 si js/supabase-config.js no corresponde a .env

El sitio es estático: el navegador no puede leer .env. Este script copia la URL del proyecto, la clave publicable
(sb_publishable_…) y la clave de sitio de Turnstile. Se niega a escribir si detecta una clave secreta.
js/supabase-config.js lo cargan la portada (acceso), /registro/, /acceso/contrasena/, el constructor A Medida y la tienda.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV, OUT = ROOT / ".env", ROOT / "js" / "supabase-config.js"
PUBLICAS = {"SUPABASE_URL": "url", "SUPABASE_PUBLISHABLE_KEY": "publishableKey", "TURNSTILE_SITE_KEY": "turnstileSiteKey"}


def leer_env():
    if not ENV.exists():
        sys.exit("Falta .env (copia .env.example).")
    vals = {}
    for linea in ENV.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", linea)
        if m and not linea.lstrip().startswith("#"):
            vals[m.group(1)] = m.group(2).strip("'\"")
    return vals


def publicos(vals):
    out = {}
    for k, campo in PUBLICAS.items():
        v = vals.get(k, "")
        if "<" in v or v.endswith("..."):           # plantilla sin llenar
            v = ""
        if v.startswith("sb_secret_") or "service_role" in v:
            sys.exit(f"{k} parece una clave SECRETA: no se escribe nada.")
        out[campo] = v
    if out["url"] and not re.match(r"^https://[a-z0-9]{20}\.supabase\.co$", out["url"]):
        sys.exit(f"SUPABASE_URL no tiene la forma https://<ref>.supabase.co: {out['url']}")
    if out["publishableKey"] and not out["publishableKey"].startswith("sb_publishable_"):
        sys.exit("SUPABASE_PUBLISHABLE_KEY debe empezar por sb_publishable_ (no uses la anon heredada).")
    return out


def render(cfg):
    return (
        "/* Casa Siego — supabase-config.js (generado por tools/env-a-config.py desde .env; no editar a mano)\n"
        "   Solo valores públicos: la clave publicable va al navegador por diseño; lo que permite lo limitan Auth y RLS.\n"
        "   Vacío = Supabase sin configurar: el acceso falla y redirige, el registro no envía y la tienda usa db/productos.json. */\n"
        f"window.CASASIEGO_SUPABASE = {json.dumps(cfg, indent=2, ensure_ascii=False)};\n"
    )


def main():
    texto = render(publicos(leer_env()))
    if "--check" in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding="utf-8") == texto
        print("js/supabase-config.js al día" if ok else "js/supabase-config.js NO corresponde a .env")
        sys.exit(0 if ok else 1)
    OUT.write_text(texto, encoding="utf-8")
    print(f"escrito {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
