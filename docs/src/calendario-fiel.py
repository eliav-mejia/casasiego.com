"""Builds brands/fiel/agenda/calendario.json: the internal calendar of Fiel Mascotas (v1.2.3).

52 weeks, Monday to Sunday, starting INICIO. Each week opens three days: Sunday always, plus two
weekdays (Monday to Friday) drawn with a fixed seed, so the same seed always gives the same calendar.
Saturday never opens. Every open day has two slots, both at golden hour in Mexico City:
  mañana  the first hour after sunrise    (start rounded up to 5 min, ends 60 min later)
  tarde   the last hour before sunset     (start rounded down to 5 min, ends 60 min later)
One team, so a slot holds one session of any kind (Esencial, Clásica or Legado; Legado is 45 min).
Booked slots are not stored here: they go in brands/fiel/agenda/ocupados.json, by hand.

Run:  python3 docs/src/calendario-fiel.py            (writes the JSON and prints a summary)
      python3 docs/src/calendario-fiel.py --tabla    (also writes the 52-week table for the internal
                                                      note _interno/docs/Calendar/)"""
import json
import math
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "brands/fiel/agenda/calendario.json"
TABLA = RAIZ / "_interno/docs/Calendar/src/tabla-52-semanas.html"

VERSION = "1.2.3"
SEMILLA = "casasiego-fiel-calendario-v1.2.3"
INICIO = date(2026, 11, 2)            # Monday after the proposal (27 Oct 2026)
SEMANAS = 52
DIAS_ENTRE_SEMANA = 2                 # plus Sunday = 3 open days per week
VENTANA_MIN = 60                      # golden hour, minutes
ANTICIPACION_HORAS = 24               # the page hides slots that start sooner than this

# Parque México, Condesa (the sessions' home park). Mexico City has no daylight saving since 2022.
LAT, LON = 19.4119, -99.1694
UTC_OFFSET = timedelta(hours=-6)
ZONA = timezone(UTC_OFFSET)

DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]


def sol(d: date) -> tuple[datetime, datetime]:
    """Sunrise and sunset (local time) for day d, NOAA solar equations, standard −0.833° horizon."""
    n = d.timetuple().tm_yday
    g = 2 * math.pi / 365 * (n - 1)                     # fractional year at local noon is close enough
    eqt = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                    - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    dec = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g)
           + 0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    lat = math.radians(LAT)
    ha = math.degrees(math.acos(math.cos(math.radians(90.833)) / (math.cos(lat) * math.cos(dec))
                                - math.tan(lat) * math.tan(dec)))
    medianoche = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    salida = medianoche + timedelta(minutes=720 - 4 * (LON + ha) - eqt)
    puesta = medianoche + timedelta(minutes=720 - 4 * (LON - ha) - eqt)
    return salida.astimezone(ZONA), puesta.astimezone(ZONA)


def redondear(t: datetime, arriba: bool) -> datetime:
    t = t.replace(second=0, microsecond=0) + (timedelta(minutes=1) if arriba and t.second else timedelta())
    resto = t.minute % 5
    if resto:
        t += timedelta(minutes=(5 - resto) if arriba else -resto)
    return t


def hhmm(t: datetime) -> str:
    return t.strftime("%H:%M")


def dias_abiertos() -> list[date]:
    azar = random.Random(SEMILLA)
    dias = []
    for s in range(SEMANAS):
        lunes = INICIO + timedelta(weeks=s)
        entre_semana = sorted(azar.sample(range(5), DIAS_ENTRE_SEMANA))   # 0 = Monday … 4 = Friday
        dias += [lunes + timedelta(days=i) for i in entre_semana] + [lunes + timedelta(days=6)]
    return dias


def calendario() -> dict:
    dias = []
    for d in dias_abiertos():
        salida, puesta = sol(d)
        manana = redondear(salida, arriba=True)
        tarde = redondear(puesta - timedelta(minutes=VENTANA_MIN), arriba=False)
        dias.append({
            "fecha": d.isoformat(),
            "manana": {"inicio": hhmm(manana), "fin": hhmm(manana + timedelta(minutes=VENTANA_MIN))},
            "tarde": {"inicio": hhmm(tarde), "fin": hhmm(tarde + timedelta(minutes=VENTANA_MIN))},
            "sol": {"salida": hhmm(salida), "puesta": hhmm(puesta)},
        })
    return {
        "version": VERSION,
        "generado": "python3 docs/src/calendario-fiel.py",
        "semilla": SEMILLA,
        "zona": "America/Mexico_City",
        "utc": "-06:00",
        "lugar": {"nombre": "Parque México, Condesa", "lat": LAT, "lon": LON},
        "desde": INICIO.isoformat(),
        "hasta": (INICIO + timedelta(weeks=SEMANAS, days=-1)).isoformat(),
        "anticipacion_horas": ANTICIPACION_HORAS,
        "ventana_min": VENTANA_MIN,
        "dias": dias,
    }


def tabla(cal: dict) -> str:
    """52 rows, one per week: the internal reference printed in the Calendar note."""
    filas = []
    por_fecha = {x["fecha"]: x for x in cal["dias"]}
    for s in range(SEMANAS):
        lunes = INICIO + timedelta(weeks=s)
        celdas = []
        for i in range(7):
            d = lunes + timedelta(days=i)
            x = por_fecha.get(d.isoformat())
            if i == 5:
                celdas.append('<td class="cerrado">—</td>')
            elif x:
                celdas.append(f'<td class="abierto"><b>{d.day}</b><span>{x["manana"]["inicio"]} · {x["tarde"]["inicio"]}</span></td>')
            else:
                celdas.append(f'<td>{d.day}</td>')
        mes = MESES[lunes.month - 1][:3]
        filas.append(f'<tr><th>{s + 1}</th><td class="mes">{mes} {lunes.year}</td>{"".join(celdas)}</tr>')
    cabeza = "".join(f"<th>{d[:3]}</th>" for d in DIAS)
    return ('<table class="semanas"><thead><tr><th>Sem.</th><th>Desde</th>' + cabeza + '</tr></thead><tbody>\n'
            + "\n".join(filas) + "\n</tbody></table>\n")


def main() -> None:
    cal = calendario()
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(cal, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    m = [x["manana"]["inicio"] for x in cal["dias"]]
    t = [x["tarde"]["inicio"] for x in cal["dias"]]
    print(f"{SALIDA.relative_to(RAIZ)}: {len(cal['dias'])} días ({cal['desde']} → {cal['hasta']})")
    print(f"  mañana {min(m)}–{max(m)} · tarde {min(t)}–{max(t)}")
    if "--tabla" in sys.argv:
        TABLA.parent.mkdir(parents=True, exist_ok=True)
        TABLA.write_text(tabla(cal), encoding="utf-8")
        print(f"{TABLA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
