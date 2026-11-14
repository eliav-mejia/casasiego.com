/* Dresser · Casa Siego (v1.0.0)
   Silueta de maniquí (hombre / mujer) que se deforma en tiempo real con las medidas de confección,
   y probador de una camisa de cuello italiano (blanca, celeste o a rayas) con reporte de ajuste por zona.
   Sin dependencias: Canvas 2D. Unidades internas: cm (mundo con y hacia arriba, suelo en y = 0). */
(() => {
  'use strict';
  const D = window.DRESSER;
  const $ = id => document.getElementById(id);
  const PI = Math.PI;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ancho = (C, r) => 2 * C / (PI * (1 + r));   // ancho frontal de una sección elíptica de perímetro C y razón fondo/ancho r
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const off = (a, n, k) => ({ x: a.x + n.x * k, y: a.y + n.y * k });
  const espejo = p => ({ x: -p.x, y: p.y });

  const AZUL = '#6B1E2C', ROJO = '#e11d48', AMBAR = '#d97706';
  const COLOR_ST = { ok: AZUL, bajo: ROJO, alto: AMBAR };
  const CLAVE = 'casasiego-dresser/1';
  const IDS = D.medidas.map(m => m.id);
  const DEF = Object.fromEntries(D.medidas.map(m => [m.id, m]));
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- Estado
  const promedio = s => ({ ...D.presets[s].find(p => p.id === 'promedio').v });
  const inicial = () => ({
    sexo: 'h', unidades: 'cm', guias: true,
    medidas: { h: promedio('h'), m: promedio('m') },
    camisa: { puesta: true, color: 'blanca', corte: 'slim', talla: null }   // talla null = automática
  });
  let E = inicial();
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (s && s.medidas) {
      if (s.sexo === 'h' || s.sexo === 'm') E.sexo = s.sexo;
      if (s.unidades === 'in') E.unidades = 'in';
      if (s.guias === false) E.guias = false;
      for (const k of ['h', 'm']) for (const id of IDS) {
        const v = +(s.medidas[k] || {})[id];
        if (Number.isFinite(v)) E.medidas[k][id] = clamp(v, DEF[id].min, DEF[id].max);
      }
      const c = s.camisa || {};
      if (typeof c.puesta === 'boolean') E.camisa.puesta = c.puesta;
      if (D.camisa.colores.some(x => x.id === c.color)) E.camisa.color = c.color;
      if (c.corte === 'regular') E.camisa.corte = 'regular';
      if (D.camisa.tallas[E.sexo].includes(c.talla)) E.camisa.talla = c.talla;
    }
  } catch { /* sin almacenamiento: se queda el estado inicial */ }
  // URL: ?sexo=m · ?color=rayas · ?talla=42 · ?corte=regular · ?t=5 (salta la intro: entra ya escaneado y vestido)
  const Q = new URLSearchParams(location.search);
  if (Q.get('sexo') === 'h' || Q.get('sexo') === 'm') E.sexo = Q.get('sexo');
  if (D.camisa.colores.some(x => x.id === Q.get('color'))) E.camisa.color = Q.get('color');
  if (Q.get('corte') === 'slim' || Q.get('corte') === 'regular') E.camisa.corte = Q.get('corte');
  if (Q.has('talla')) E.camisa.talla = D.camisa.tallas[E.sexo].includes(+Q.get('talla')) ? +Q.get('talla') : null;
  const precalentar = +Q.get('t') || 0;
  let tGuardar = 0;
  const guardar = () => { clearTimeout(tGuardar); tGuardar = setTimeout(() => { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch {} }, 250); };
  const objetivo = () => E.medidas[E.sexo];

  // ---------------------------------------------------------------- Camisa: tabla de tallas, ajuste y recomendación
  function prenda(sexo, talla, corte) {
    const slim = corte === 'slim';
    if (sexo === 'h') {
      const d = talla - 38, pecho = (slim ? 102 : 110) + d * 4;
      return { sexo, talla, corte, cuello: talla, pecho, cintura: pecho - (slim ? 10 : 4), bajo: pecho - (slim ? 4 : 2),
               hombros: 45 + d, manga: 63 + d * 0.75, largo: 76 + d, puno: 24 + d * 0.4 };
    }
    const d = (talla - 36) / 2;
    return { sexo, talla, corte, cuello: 36 + d * 0.8, pecho: 84 + d * 4 + (slim ? 8 : 12), cintura: 68 + d * 4 + (slim ? 8 : 13),
             bajo: 94 + d * 4 + (slim ? 6 : 9), hombros: 38 + d, manga: 59 + d * 0.6, largo: 64 + d, puno: 21 + d * 0.4 };
  }
  const nbFrac = f => lerp(0.834, 0.831, f);
  const TEXTOS = {
    cuello:  { bajo: 'No cierra', ok: 'Cierra bien', alto: 'Holgado' },
    hombros: { bajo: 'Estrecho', ok: 'En su punto', alto: 'Caído' },
    pecho:   { bajo: 'Ajustado', ok: 'Correcto', alto: 'Holgado' },
    cintura: { bajo: 'Ajustada', ok: 'Correcta', alto: 'Holgada' },
    bajo:    { bajo: 'Ajustado', ok: 'Correcto', alto: 'Holgado' },
    manga:   { bajo: 'Corta', ok: 'Correcta', alto: 'Larga' },
    largo:   { bajo: 'Corta', ok: 'Correcto', alto: 'Larga' }
  };
  function evaluar(sexo, m, G) {
    const f = sexo === 'm' ? 1 : 0;
    const crY = clamp(m.entrepierna, m.altura * 0.40, m.altura * 0.52);
    const hemY = m.altura * nbFrac(f) - G.largo;
    const zonas = [
      ['cuello', 'Cuello', G.cuello, m.cuello],
      ['hombros', 'Hombros', G.hombros, m.hombros],
      ['pecho', sexo === 'm' ? 'Busto' : 'Pecho', G.pecho, m.pecho],
      ['cintura', 'Cintura', G.cintura, m.cintura],
      ['bajo', 'Bajo · cadera', G.bajo, m.cadera],
      ['manga', 'Manga', G.manga, m.brazo],
      ['largo', 'Largo', G.largo, null, crY - hemY]
    ];
    return zonas.map(([id, nombre, p, c, difFija]) => {
      const dif = difFija ?? (p - c);
      const [lo, hi] = D.camisa.reglas[id][sexo];
      const st = dif < lo ? 'bajo' : dif > hi ? 'alto' : 'ok';
      return { id, nombre, p, c, dif, lo, hi, st, txt: TEXTOS[id][st] };
    });
  }
  // La talla más chica, en el corte elegido, que no aprieta en cuello, pecho, cintura ni cadera.
  function recomendar(sexo, m, corte) {
    const lista = D.camisa.tallas[sexo];
    for (const t of lista) {
      const ev = evaluar(sexo, m, prenda(sexo, t, corte));
      if (ev.every(z => !['cuello', 'pecho', 'cintura', 'bajo'].includes(z.id) || z.st !== 'bajo')) return t;
    }
    return lista[lista.length - 1];
  }
  const tallaActual = () => E.camisa.talla ?? recomendar(E.sexo, objetivo(), E.camisa.corte);
  const prendaActual = () => prenda(E.sexo, tallaActual(), E.camisa.corte);

  function tipoCuerpo(m) {
    const p = m.pecho, w = m.cintura, h = m.cadera;
    if (Math.abs(p - h) <= 6 && w <= Math.min(p, h) * 0.8) return 'Reloj de arena';
    if (h - p > 6) return 'Pera';
    if (p - h >= 5 && p - w >= 16) return 'Triángulo invertido · V';
    if (w >= p * 0.94) return 'Óvalo';
    return 'Rectángulo';
  }

  // ---------------------------------------------------------------- Modelo del cuerpo
  // m: medidas (cm), f: 0 hombre → 1 mujer (se mezcla al cambiar), t: segundos (respiración y balanceo)
  function cuerpo(m, f, t) {
    const H = m.altura, L = (a, b) => lerp(a, b, f);
    const g = { H, f, m };
    g.headH = H * L(0.130, 0.128);
    g.headW = g.headH * L(0.70, 0.68);
    g.chinY = H - g.headH;
    g.nbY = H * nbFrac(f);
    g.shY = H * L(0.818, 0.810);
    g.apY = H * 0.750;
    g.chY = H * L(0.727, 0.720);
    g.waY = H * L(0.607, 0.627);
    g.crY = clamp(m.entrepierna, H * 0.40, H * 0.52);
    g.hiY = Math.max(H * L(0.517, 0.522), g.crY + 6);
    g.knY = g.crY * 0.6;
    g.caY = g.knY * 0.7;
    g.anY = H * 0.045;

    const resp = reducido ? 0 : Math.sin(t * 1.7);
    g.nw = ancho(m.cuello, 0.95) / 2;
    g.shX = m.hombros / 2;
    g.chW = ancho(m.pecho, L(0.66, 0.74)) / 2 * (1 + 0.007 * resp);
    g.waW = ancho(m.cintura, L(0.80, 0.76)) / 2 * (1 + 0.004 * resp);
    g.hiW = ancho(m.cadera, L(0.74, 0.68)) / 2;

    // Piernas
    g.thD = m.muslo / PI * 1.02;
    g.knD = m.muslo * 0.68 / PI;
    g.cfD = m.muslo * 0.66 / PI * 1.06;
    g.anD = m.muneca * 1.35 / PI;
    g.thIn = Math.max(0.6, g.hiW * 0.95 - g.thD);
    g.thOut = Math.max(g.hiW * L(0.93, 0.98), g.thIn + g.thD);
    g.cT = (g.thIn + g.thOut) / 2;
    g.cA = g.cT * 0.85 + 1;
    const enPierna = y => lerp(g.cT, g.cA, (g.crY - y) / (g.crY - g.anY));
    g.cK = enPierna(g.knY); g.cC = enPierna(g.caY);
    g.mT = (g.crY + g.knY) / 2; g.cM = enPierna(g.mT);

    // Brazos: hombro (J) → codo (E) → muñeca (W). Longitud J→W = largo de brazo.
    const a1 = (L(8, 6.5) + (reducido ? 0 : 1.1 * Math.sin(t * 0.8))) * PI / 180, a2 = a1 + L(5, 8) * PI / 180;
    g.brazo = m.brazo; g.ua = m.brazo * 0.56; g.fa = m.brazo * 0.44;
    g.J = { x: g.shX - 1.8, y: g.shY - 1.2 + 0.25 * resp };
    g.d1 = { x: Math.sin(a1), y: -Math.cos(a1) }; g.n1 = { x: Math.cos(a1), y: Math.sin(a1) };
    g.d2 = { x: Math.sin(a2), y: -Math.cos(a2) }; g.n2 = { x: Math.cos(a2), y: Math.sin(a2) };
    g.E = off(g.J, g.d1, g.ua);
    g.W = off(g.E, g.d2, g.fa);
    g.bD = m.biceps / PI * 1.05;
    g.wD = m.muneca / PI * 1.2;
    g.fD = (m.biceps * 0.6 + m.muneca * 0.55) / PI;
    g.tablaBrazo = [[0, g.bD * 1.38], [g.ua * 0.3, g.bD * 1.12], [g.ua * 0.6, g.bD], [g.ua * 0.93, g.bD * 0.74],
                    [g.ua + g.fa * 0.28, g.fD], [g.ua + g.fa, g.wD]];
    g.handL = H * 0.106; g.handW = g.wD * 1.4;
    return g;
  }
  function brazoEn(g, d) {
    if (d <= g.ua) return { c: off(g.J, g.d1, d), n: g.n1 };
    return { c: off(g.E, g.d2, d - g.ua), n: g.n2 };
  }
  function anchoBrazo(g, d) {
    const T = g.tablaBrazo;
    if (d <= 0) return T[0][1];
    for (let i = 1; i < T.length; i++) if (d <= T[i][0]) return lerp(T[i - 1][1], T[i][1], (d - T[i - 1][0]) / (T[i][0] - T[i - 1][0]));
    return g.wD;
  }
  // Medio ancho del torso/pierna a la altura y (para colocar la camisa).
  function mitadEn(g, y) {
    const T = [[g.apY, g.chW], [g.chY, g.chW], [g.waY, g.waW], [g.hiY, g.hiW], [g.crY - 2, g.thOut]];
    if (y >= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) if (y >= T[i][0]) return lerp(T[i][1], T[i - 1][1], (y - T[i][0]) / (T[i - 1][0] - T[i][0]));
    return g.thOut;
  }

  function siluetaPts(g) {
    const R = [
      { x: g.nw * 0.96, y: g.chinY + g.headH * 0.12 },
      { x: g.nw, y: g.nbY + 1.2 },
      { x: lerp(g.nw, g.shX, 0.55), y: lerp(g.nbY, g.shY, 0.78) },
      { x: g.shX, y: g.shY },
      { x: g.chW + 0.2, y: g.apY },
      { x: g.chW, y: g.chY },
      { x: lerp(g.chW, g.waW, 0.55), y: lerp(g.chY, g.waY, 0.5) },
      { x: g.waW, y: g.waY },
      { x: lerp(g.waW, g.hiW, 0.72), y: lerp(g.waY, g.hiY, 0.55) },
      { x: g.hiW, y: g.hiY },
      { x: g.thOut, y: g.crY - 2 },
      { x: g.cM + g.thD * 0.43, y: g.mT },
      { x: g.cK + g.knD / 2, y: g.knY + 1 },
      { x: g.cC + g.cfD / 2, y: g.caY },
      { x: g.cA + g.anD / 2, y: g.anY + 4 },
      { x: g.cA + g.anD / 2 + 0.9, y: 2.4 },
      { x: g.cA + 3.6, y: 0.4 },
      { x: g.cA + 1, y: 0 },
      { x: g.cA - 2.4, y: 0.3 },
      { x: g.cA - g.anD / 2 - 0.4, y: 2.4 },
      { x: g.cA - g.anD / 2, y: g.anY + 4 },
      { x: g.cC - g.cfD / 2 * 0.9, y: g.caY + 2 },
      { x: g.cK - g.knD / 2, y: g.knY },
      { x: g.cM - g.thD * 0.45, y: g.mT },
      { x: g.thIn, y: g.crY - 2 },
      { x: 0, y: g.crY + 0.6 }
    ];
    return R.concat(R.slice(0, -1).map(espejo).reverse());
  }
  function cabezaPts(g) {
    const cy = g.H - g.headH * 0.5, rx = g.headW / 2, ry = g.headH * 0.5, pts = [];
    for (let i = 0; i < 32; i++) {
      const th = i / 32 * 2 * PI, c = Math.cos(th);
      let x = Math.sin(th) * rx;
      if (c < 0) x *= 1 - 0.24 * Math.pow(-c, 1.6);
      pts.push({ x, y: cy + c * ry });
    }
    return pts;
  }
  function manoPts(g) {
    const l = g.handL, w = g.handW, wd = g.wD;
    const p = (a, b) => ({ x: g.W.x + g.d2.x * l * a + g.n2.x * b, y: g.W.y + g.d2.y * l * a + g.n2.y * b });
    return [p(0.3, w * 0.5), p(0.68, w * 0.44), p(0.93, w * 0.22), p(1.0, -w * 0.04), p(0.9, -w * 0.3), p(0.58, -w * 0.42), p(0.3, -w * 0.6), p(0.08, -wd * 0.56)];
  }
  function brazoPts(g) {
    const ua = g.ua, fa = g.fa, out = [{ x: g.shX - 0.4, y: g.shY + 1.5 }], inn = [];
    for (const d of [ua * 0.1, ua * 0.32, ua * 0.6, ua * 0.93, ua + fa * 0.28, ua + fa * 0.72, g.brazo]) {
      const { c, n } = brazoEn(g, d); out.push(off(c, n, anchoBrazo(g, d) / 2 * (d < ua * 0.4 ? 1.06 : 1)));
    }
    for (const d of [g.brazo, ua + fa * 0.72, ua + fa * 0.28, ua * 0.93, ua * 0.6, ua * 0.3]) {
      const { c, n } = brazoEn(g, d); inn.push(off(c, n, -anchoBrazo(g, d) / 2));
    }
    return [...out, ...manoPts(g), ...inn];
  }

  // ---------------------------------------------------------------- Geometría de la camisa
  function camisaGeo(g, G, ev) {
    const r = 0.62, s = {};
    const st = Object.fromEntries(ev.map(z => [z.id, z]));
    s.st = st;
    s.cerrado = st.cuello.st !== 'bajo';
    s.nwC = Math.max(g.nw + 0.8, ancho(G.cuello, 0.95) / 2 + 0.3);
    s.sx = G.hombros / 2;
    s.sy = g.shY + 0.6 - Math.max(0, s.sx - g.shX) * 0.8;
    s.cW = Math.max(ancho(G.pecho, r) / 2, g.chW + 0.5);
    s.wW = Math.max(ancho(G.cintura, r) / 2, g.waW + 0.5);
    s.hemY = g.nbY - G.largo;
    s.hsY = s.hemY + 7;
    s.hW = Math.max(ancho(G.bajo, r) / 2, mitadEn(g, s.hsY) + 0.5);
    s.hipW = Math.max(lerp(s.wW, s.hW, 0.6), g.hiW + 0.5);
    // Manga: se mide desde la costura del hombro.
    s.dEnd = G.manga + (s.sx - g.shX) * 0.9;
    s.exceso = Math.max(0, s.dEnd - g.brazo);
    s.dCuff = s.dEnd > g.brazo ? g.brazo + Math.min(s.exceso * 0.5, g.handL * 0.3) : s.dEnd;
    s.cuffW = Math.max(G.puno / PI * 1.12, g.wD + 0.8);
    s.ease = G.corte === 'slim' ? 1.12 : 1.26;
    s.boton0 = s.cerrado ? g.nbY - 0.8 : g.nbY - 8;
    return s;
  }
  function camisaPts(g, s) {
    const R = [
      { x: s.nwC, y: g.nbY + 3.4 },
      { x: lerp(s.nwC, s.sx, 0.5), y: lerp(g.nbY + 2.6, s.sy, 0.62) },
      { x: s.sx, y: s.sy },
      { x: s.cW + 0.5, y: g.apY - 0.6 },
      { x: s.cW, y: g.chY },
      { x: s.wW, y: g.waY }
    ];
    if (s.hsY < g.hiY - 2) R.push({ x: s.hipW, y: g.hiY });
    R.push({ x: s.hW, y: s.hsY }, { x: s.hW * 0.95, y: s.hemY + 5 }, { x: s.hW * 0.62, y: s.hemY + 1.4 }, { x: 0, y: s.hemY });
    return R.concat(R.slice(0, -1).map(espejo).reverse());
  }
  function mangaPts(g, s) {
    const d0 = g.ua * 0.12 + 3, d1 = s.dCuff - 6, N = 7;
    const sw = d => lerp(anchoBrazo(g, d) * s.ease + 0.6, s.cuffW * 1.06, suave(d1 - 12, d1, d));
    const out = [{ x: s.sx, y: s.sy }], inn = [];
    for (let i = 0; i <= N; i++) { const d = lerp(d0, d1, i / N), { c, n } = brazoEn(g, d); out.push(off(c, n, sw(d) / 2 * (d < g.ua * 0.4 ? 1.05 : 1))); }
    for (let i = N; i >= 0; i--) { const d = lerp(g.ua * 0.34, d1, i / N), { c, n } = brazoEn(g, d); inn.push(off(c, n, -sw(d) / 2)); }
    return [...out, ...inn, { x: s.cW + 0.5, y: g.apY - 0.6 }, { x: s.sx - 1.4, y: lerp(s.sy, g.apY, 0.55) }];
  }

  // ---------------------------------------------------------------- Lienzo y vista
  const cv = $('lienzo'), ctx = cv.getContext('2d');
  let W = 0, Hc = 0, dpr = 1, S = 1, OX = 0, OY = 0;
  const vista = { zoom: 1, px: 0, py: 0 };
  function medir() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; Hc = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr);
  }
  const compacto = () => W < 600;   // escena angosta: solo puntos, y la etiqueta de lo que se edita
  const base = () => ({ s0: Math.min(Hc * 0.86 / 208, W * 0.92 / (compacto() ? 84 : 150)), ox0: W / 2, oy0: Hc * 0.93 });
  function aplicarVista() { const b = base(); S = b.s0 * vista.zoom; OX = b.ox0 + vista.px; OY = b.oy0 + vista.py; }
  const P = (x, y) => ({ x: OX + x * S, y: OY - y * S });

  // Catmull-Rom → Bézier (puntos en mundo)
  function curva(pts, cerrar) {
    const q = pts.map(p => P(p.x, p.y)), n = q.length;
    if (n < 2) return;
    ctx.moveTo(q[0].x, q[0].y);
    const k = 1 / 6, lim = cerrar ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const p0 = q[cerrar ? (i - 1 + n) % n : Math.max(i - 1, 0)], p1 = q[i], p2 = q[(i + 1) % n], p3 = q[cerrar ? (i + 2) % n : Math.min(i + 2, n - 1)];
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) * k, p1.y + (p2.y - p0.y) * k, p2.x - (p3.x - p1.x) * k, p2.y - (p3.y - p1.y) * k, p2.x, p2.y);
    }
    if (cerrar) ctx.closePath();
  }
  function poli(pts) { const q = pts.map(p => P(p.x, p.y)); ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i].x, q[i].y); ctx.closePath(); }
  function linea(a, b, c) { const A = P(a.x, a.y), B = P(b.x, b.y); ctx.moveTo(A.x, A.y); if (c) { const C = P(c.x, c.y); ctx.quadraticCurveTo(C.x, C.y, B.x, B.y); } else ctx.lineTo(B.x, B.y); }
  const lw = cm => Math.max(0.6, cm * S);

  let piel = null;
  function pintarPiel(g) {
    const a = P(0, g.H), b = P(0, 0);
    piel = ctx.createLinearGradient(0, a.y, 0, b.y);
    piel.addColorStop(0, 'rgba(247,242,234,.97)');
    piel.addColorStop(1, 'rgba(238,228,211,.97)');
  }

  // Tela a rayas: patrón que se rehace al cambiar la escala.
  let rayas = null, rayasS = 0;
  function patronRayas() {
    if (rayas && Math.abs(rayasS - S) < 0.01) return rayas;
    const per = Math.max(3, Math.round(1.1 * S * dpr)) / dpr;
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(per * dpr)); c.height = 2;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, 2);
    x.fillStyle = '#b9d4f4'; x.fillRect(0, 0, Math.max(1, Math.round(c.width * 0.42)), 2);
    rayas = ctx.createPattern(c, 'repeat'); rayasS = S;
    return rayas;
  }

  // ---------------------------------------------------------------- Dibujo
  const M = { ...objetivo() };        // medidas mostradas (persiguen al objetivo)
  let fem = E.sexo === 'm' ? 1 : 0;
  let GA = null;                       // prenda mostrada (interpolada)
  let vis = precalentar && E.camisa.puesta ? 1 : 0;   // 0..1 camisa puesta
  let activo = null;                   // medida o zona resaltada
  let tIntro = 0;
  let EV = [];                         // evaluación vigente (objetivo, no animada)

  function dibujarCuerpo(g) {
    // Sombra de piso
    const sp = P(0, 0), rx = (g.cA + 14) * S;
    const gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rx);
    gr.addColorStop(0, 'rgba(107,30,44,.16)'); gr.addColorStop(1, 'rgba(107,30,44,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx, rx * 0.12, 0, 0, 2 * PI); ctx.fill();

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = piel; ctx.strokeStyle = AZUL; ctx.lineWidth = 1.6;
    ctx.beginPath(); curva(siluetaPts(g), true); ctx.fill(); ctx.stroke();

    // Líneas interiores del maniquí
    ctx.strokeStyle = 'rgba(107,30,44,.32)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of [1, -1]) {
      const x = v => v * k;
      linea({ x: x(1.4), y: g.nbY - 1.2 }, { x: x(g.shX * 0.86), y: g.shY + 0.2 }, { x: x(g.shX * 0.45), y: g.nbY - 2.6 });   // clavícula
      linea({ x: x(g.hiW * 0.8), y: g.hiY + 3 }, { x: x(g.thIn + 1.5), y: g.crY + 2.5 }, { x: x(g.hiW * 0.42), y: g.hiY - 3 }); // ingle
      linea({ x: x(g.cK - g.knD * 0.2), y: g.knY - 0.5 }, { x: x(g.cK + g.knD * 0.2), y: g.knY - 0.5 }, { x: x(g.cK), y: g.knY - 2.2 }); // rodilla
    }
    ctx.stroke();
    // Pectoral (hombre) ↔ busto (mujer), mezclados por fem
    ctx.save();
    ctx.globalAlpha = 1 - fem; ctx.beginPath();
    for (const k of [1, -1]) linea({ x: 0.8 * k, y: g.chY - 2.5 }, { x: g.chW * 0.88 * k, y: g.chY - 0.6 }, { x: g.chW * 0.5 * k, y: g.chY - 4.6 });
    ctx.stroke();
    ctx.globalAlpha = fem; ctx.beginPath();
    const rb = (3.4 + clamp((g.m.pecho - g.m.cintura - 10) * 0.25, 0, 6)) * S;
    for (const k of [1, -1]) { const c = P(g.chW * 0.46 * k, g.chY + 0.8); ctx.moveTo(c.x + rb * Math.cos(0.12 * PI), c.y + rb * Math.sin(0.12 * PI)); ctx.arc(c.x, c.y, rb, 0.12 * PI, 0.88 * PI); }
    ctx.stroke();
    ctx.restore();
    // Ombligo y eje
    const o = P(0, g.waY - 3);
    ctx.beginPath(); ctx.ellipse(o.x, o.y, 0.5 * S, 0.7 * S, 0, 0, 2 * PI); ctx.stroke();
    ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(107,30,44,.14)';
    ctx.beginPath(); linea({ x: 0, y: g.nbY - 3 }, { x: 0, y: g.crY + 5 }); ctx.stroke(); ctx.restore();

    // Cabeza (y moño cuando es mujer)
    ctx.strokeStyle = AZUL; ctx.lineWidth = 1.6; ctx.fillStyle = piel;
    if (fem > 0.01) {
      ctx.save(); ctx.globalAlpha = fem;
      const c = P(0, g.H - g.headH * 0.04);
      ctx.beginPath(); ctx.arc(c.x, c.y, g.headW * 0.26 * S * fem, 0, 2 * PI); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); curva(cabezaPts(g), true); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(107,30,44,.32)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const k of [1, -1]) { const e = P(g.headW / 2 * k * 0.98, g.H - g.headH * 0.52); ctx.moveTo(e.x, e.y - 1.6 * S); ctx.quadraticCurveTo(e.x + 1.1 * S * k, e.y, e.x, e.y + 1.8 * S); }
    ctx.stroke();

    dibujarBrazo(g, 1); dibujarBrazo(g, -1);
  }
  function dibujarBrazo(g, lado) {
    let pts = brazoPts(g);
    if (lado < 0) pts = pts.map(espejo);
    ctx.fillStyle = piel; ctx.strokeStyle = AZUL; ctx.lineWidth = 1.6;
    ctx.beginPath(); curva(pts, true); ctx.fill();
    ctx.beginPath(); curva(pts, false); ctx.stroke();
  }

  function dibujarCamisa(g, G, col) {
    const s = camisaGeo(g, G, EV);
    const tela = col.tela === 'rayas' ? patronRayas() : col.tela;
    const torso = camisaPts(g, s);
    // Recorte: la camisa "baja" desde el cuello al ponerla.
    const top = g.H - g.headH * 0.4, corte = lerp(top, s.hemY - 4, vis < 1 ? 1 - Math.pow(1 - vis, 3) : 1);
    const yc = P(0, corte).y;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, yc); ctx.clip();

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1.5;
    // Torso
    ctx.beginPath(); curva(torso, true);
    ctx.fillStyle = tela; ctx.fill();
    const iz = P(-s.cW, 0).x, de = P(s.cW, 0).x, sh = ctx.createLinearGradient(iz, 0, de, 0);
    sh.addColorStop(0, col.sombra); sh.addColorStop(0.22, 'rgba(255,255,255,0)'); sh.addColorStop(0.78, 'rgba(255,255,255,0)'); sh.addColorStop(1, col.sombra);
    ctx.fillStyle = sh; ctx.fill();
    ctx.stroke();

    // Abertura en V cuando el cuello no cierra
    if (!s.cerrado) {
      ctx.fillStyle = piel; ctx.beginPath();
      poli([{ x: -s.nwC * 0.8, y: g.nbY + 3.4 }, { x: s.nwC * 0.8, y: g.nbY + 3.4 }, { x: 2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }, { x: -2.4, y: g.nbY - 2.2 }]);
      ctx.fill();
      ctx.beginPath(); linea({ x: 2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }); linea({ x: -2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }); ctx.stroke();
    }

    // Tapeta y botones
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of [1.5, -1.5]) linea({ x: k, y: s.boton0 }, { x: k, y: s.hemY + 0.3 });
    ctx.stroke();
    const paso = E.sexo === 'm' ? 8.5 : 9.5, botones = [];
    for (let y = s.boton0 - 6; y > s.hemY + 5; y -= paso) botones.push(y);
    pliegues(g, s, botones, col);
    for (const y of botones) boton({ x: 0, y }, col);

    // Mangas (el brazo se redibuja encima del torso de la camisa y la manga encima del brazo)
    for (const lado of [1, -1]) {
      dibujarBrazo(g, lado);
      let pts = mangaPts(g, s);
      if (lado < 0) pts = pts.map(espejo);
      ctx.strokeStyle = col.linea; ctx.lineWidth = 1.5;
      ctx.beginPath(); curva(pts, true); ctx.fillStyle = tela; ctx.fill(); ctx.fillStyle = col.sombra; ctx.fill(); ctx.stroke();
      puno(g, s, lado, col);
    }

    cuello(g, s, col);
    ctx.restore();
    return s;
  }
  function boton(p, col) {
    const c = P(p.x, p.y), r = Math.max(1.6, 0.6 * S);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * PI);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col.linea; ctx.lineWidth = 1; ctx.stroke();
  }
  function puno(g, s, lado, col) {
    const d1 = s.dCuff - 6, X = p => lado < 0 ? espejo(p) : p;
    const a = brazoEn(g, d1), b = brazoEn(g, s.dCuff), w = s.cuffW / 2;
    ctx.beginPath();
    poli([off(a.c, a.n, w), off(b.c, b.n, w * 0.97), off(b.c, b.n, -w * 0.97), off(a.c, a.n, -w)].map(X));
    ctx.fillStyle = col.cuello === '#ffffff' ? '#ffffff' : col.tela === 'rayas' ? patronRayas() : col.cuello;
    ctx.fill(); ctx.strokeStyle = col.linea; ctx.lineWidth = 1.3; ctx.stroke();
    boton(X(off(brazoEn(g, d1 + 3).c, a.n, w * 0.45)), col);
    // Manga larga: se arruga sobre el puño
    if (s.exceso > 0.8) {
      ctx.strokeStyle = 'rgba(74,22,33,.45)'; ctx.lineWidth = 1; ctx.beginPath();
      const n = Math.min(4, Math.ceil(s.exceso / 1.5));
      for (let i = 0; i < n; i++) {
        const d = d1 - 1.6 - i * 2.2, { c, n: nn } = brazoEn(g, d), ww = w * 1.05;
        linea(X(off(c, nn, ww)), X(off(c, nn, -ww)), X(off(c, d < g.ua ? g.d1 : g.d2, 1.1)));
      }
      ctx.stroke();
    }
  }
  function cuello(g, s, col) {
    const nb = g.nbY, k = s.nwC;
    const C = s.cerrado ? { x: 0.45, y: nb + 2.6 } : { x: 2.4, y: nb - 2.2 };
    const T = s.cerrado ? { x: k + 4.6, y: nb - 4.6 } : { x: k + 5.8, y: nb - 6.2 };
    const O = { x: k + 2.4, y: nb + 2.0 }, N = { x: k - 0.3, y: nb + 4.8 }, F = { x: k * 0.5, y: nb + 3.6 };
    const tela = col.cuello === '#ffffff' ? '#ffffff' : col.tela === 'rayas' ? patronRayas() : col.cuello;
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1.4;
    if (s.cerrado) {
      // Pie de cuello visible entre las dos hojas, con el botón superior
      const yb = nb - 0.8, t = (C.y - yb) / (C.y - T.y), xr = lerp(C.x, T.x, t);
      ctx.beginPath(); poli([{ x: -C.x, y: C.y }, C, { x: xr, y: yb }, { x: -xr, y: yb }]);
      ctx.fillStyle = tela; ctx.fill(); ctx.stroke();
      boton({ x: 0, y: nb + 0.9 }, col);
    }
    for (const lado of [1, -1]) {
      const X = p => lado < 0 ? espejo(p) : p;
      const c = P(X(C).x, C.y), t = P(X(T).x, T.y), o = P(X(O).x, O.y), n = P(X(N).x, N.y), f = P(X(F).x, F.y);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(t.x, t.y); ctx.quadraticCurveTo(o.x, o.y, n.x, n.y); ctx.quadraticCurveTo(f.x, f.y, c.x, c.y); ctx.closePath();
      ctx.fillStyle = tela; ctx.fill(); ctx.fillStyle = col.sombra; ctx.fill(); ctx.stroke();
      // Pespunte
      ctx.save(); ctx.setLineDash([2, 2.5]); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(74,22,33,.55)';
      ctx.beginPath(); linea(X({ x: C.x + 0.5, y: C.y - 0.75 }), X({ x: T.x - 0.75, y: T.y + 0.55 })); ctx.stroke();
      ctx.restore();
    }
  }
  // Tensiones (X entre botones, abertura) y pliegues de holgura.
  function pliegues(g, s, botones, col) {
    const st = s.st;
    const tension = (z, ymin, ymax, k) => {
      ctx.strokeStyle = 'rgba(225,29,72,.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const y of botones) {
        if (y < ymin || y > ymax) continue;
        for (const L of [1, -1]) {
          const a = 1.8 * L, b = (1.8 + 3 + 6 * k) * L;
          linea({ x: a, y }, { x: b, y: y + 2 + 2 * k }, { x: (a + b) / 2, y: y + 0.6 });
          linea({ x: a, y }, { x: b, y: y - 2 - 2 * k }, { x: (a + b) / 2, y: y - 0.6 });
        }
      }
      ctx.stroke();
      ctx.fillStyle = piel; ctx.strokeStyle = 'rgba(225,29,72,.6)';
      for (let i = 0; i < botones.length - 1; i++) {
        const y = (botones[i] + botones[i + 1]) / 2;
        if (y < ymin || y > ymax) continue;
        const c = P(0, y);
        ctx.beginPath(); ctx.ellipse(c.x, c.y, (0.3 + 0.7 * k) * S, (0.9 + 1.6 * k) * S, 0, 0, 2 * PI); ctx.fill(); ctx.stroke();
      }
    };
    const kP = clamp((st.pecho.lo - st.pecho.dif) / 10, 0.15, 1), kW = clamp((st.cintura.lo - st.cintura.dif) / 10, 0.15, 1);
    if (st.pecho.st === 'bajo') tension('pecho', g.waY + 4, g.apY, kP);
    if (st.cintura.st === 'bajo') tension('cintura', g.hiY - 2, g.waY + 4, kW);
    if (st.bajo.st === 'bajo') {
      ctx.strokeStyle = 'rgba(225,29,72,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const L of [1, -1]) for (let i = 0; i < 3; i++) linea({ x: s.hW * 0.55 * L, y: s.hsY + 1 + i * 2.4 }, { x: s.hW * 0.95 * L, y: s.hsY + i * 2.4 + 1.6 }, { x: s.hW * 0.75 * L, y: s.hsY + i * 2.4 + 0.4 });
      ctx.stroke();
    }
    if (st.hombros.st === 'bajo') {
      ctx.strokeStyle = 'rgba(225,29,72,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const L of [1, -1]) for (let i = 0; i < 2; i++) linea({ x: (s.sx - 1) * L, y: s.sy - 2 - i * 2.5 }, { x: (s.nwC + 2) * L, y: g.nbY - 1 - i * 2.5 });
      ctx.stroke();
    }
    // Holgura: caídas verticales y bolsa sobre la cintura
    const flojo = (st.pecho.st === 'alto') + (st.cintura.st === 'alto');
    if (flojo) {
      ctx.strokeStyle = 'rgba(217,119,6,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const L of [1, -1]) {
        linea({ x: s.cW * 0.62 * L, y: g.apY - 3 }, { x: s.wW * 0.66 * L, y: s.hemY + 9 }, { x: s.cW * 0.48 * L, y: g.waY + 4 });
        if (flojo > 1) linea({ x: s.cW * 0.84 * L, y: g.apY - 6 }, { x: s.hW * 0.86 * L, y: s.hsY + 2 }, { x: s.wW * 0.98 * L, y: g.waY });
      }
      linea({ x: -s.wW * 0.82, y: g.waY - 2 }, { x: s.wW * 0.82, y: g.waY - 2 }, { x: 0, y: g.waY - 4.5 });
      ctx.stroke();
    }
    if (st.hombros.st === 'alto') {
      ctx.strokeStyle = 'rgba(217,119,6,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const L of [1, -1]) linea({ x: (s.sx - 1.5) * L, y: s.sy - 3 }, { x: (s.sx + 1.2) * L, y: s.sy - 7 }, { x: (s.sx + 0.6) * L, y: s.sy - 4 });
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- Guías de medida y etiquetas
  const fmt = (cm, dec) => E.unidades === 'in' ? (cm / 2.54).toFixed(1) + ' in' : (dec ? cm.toFixed(1) : (Math.round(cm * 2) / 2).toString()) + ' cm';
  const fmtDif = cm => (cm >= 0 ? '+' : '−') + (E.unidades === 'in' ? (Math.abs(cm) / 2.54).toFixed(1) + ' in' : (Math.round(Math.abs(cm) * 2) / 2) + ' cm');
  const nombreDe = id => (E.sexo === 'm' && DEF[id].nombreM) || DEF[id].nombre;

  function anillo(cx, cy, rx, ry, rot, color, fuerte) {
    const c = P(cx, cy);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = fuerte ? 2.4 : 1.2;
    ctx.globalAlpha = fuerte ? 0.55 : 0.3; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * S, ry * S, rot, PI, 2 * PI); ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([]);
    if (fuerte) { ctx.shadowColor = 'rgba(107,30,44,.55)'; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * S, ry * S, rot, 0, PI); ctx.stroke();
    ctx.restore();
  }
  function cota(a, b, color, fuerte) {
    const A = P(a.x, a.y), B = P(b.x, b.y), dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 5, ny = dx / l * 5;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = fuerte ? 2.2 : 1.1; ctx.globalAlpha = fuerte ? 1 : 0.6;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    for (const p of [A, B]) { ctx.moveTo(p.x - nx, p.y - ny); ctx.lineTo(p.x + nx, p.y + ny); }
    ctx.stroke(); ctx.restore();
  }
  function guias(g, etq) {
    const m = objetivo(), col = id => (activo === id ? AZUL : '#B0905E'), f = id => activo === id;
    const add = (id, lado, anc, txt) => etq.push({ id, lado, ax: anc.x, ay: anc.y, txt, color: AZUL, fuerte: f(id) });
    // Contornos
    const an = [
      ['cuello', 0, g.nbY + 2.4, g.nw + 0.2, 0.32],
      ['pecho', 0, g.chY, g.chW + 0.3, 0.16],
      ['cintura', 0, g.waY, g.waW + 0.3, 0.17],
      ['cadera', 0, g.hiY, g.hiW + 0.3, 0.17],
      ['muslo', g.cT, g.crY - 4, g.thD / 2 + 0.2, 0.3]
    ];
    for (const [id, cx, cy, rx, k] of an) {
      anillo(cx, cy, rx, rx * k, 0, col(id), f(id));
      add(id, 1, P(cx + rx, cy), `${nombreDe(id)} ${fmt(m[id])}`);
    }
    for (const [id, d] of [['biceps', g.ua * 0.58], ['muneca', g.brazo - 1]]) {
      const { c, n } = brazoEn(g, d), w = anchoBrazo(g, d) / 2 + 0.3;
      anillo(c.x, c.y, w, w * 0.3, -Math.atan2(n.y, n.x), col(id), f(id));
      add(id, 1, P(c.x + n.x * w, c.y + n.y * w), `${nombreDe(id)} ${fmt(m[id])}`);
    }
    // Hombros: cota sobre los hombros
    const yh = g.nbY + 7;
    cota({ x: -g.shX, y: yh }, { x: g.shX, y: yh }, col('hombros'), f('hombros'));
    ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(107,30,44,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const k of [1, -1]) linea({ x: g.shX * k, y: g.shY }, { x: g.shX * k, y: yh }); ctx.stroke(); ctx.restore();
    add('hombros', -1, P(-g.shX, yh), `${nombreDe('hombros')} ${fmt(m.hombros)}`);
    // Largo de brazo: cota paralela al brazo izquierdo
    const o1 = espejo(off(g.J, g.n1, g.bD * 0.8 + 3)), o2 = espejo(off(g.W, g.n2, g.wD + 3));
    cota(o1, o2, col('brazo'), f('brazo'));
    add('brazo', -1, P((o1.x + o2.x) / 2, (o1.y + o2.y) / 2), `${nombreDe('brazo')} ${fmt(m.brazo)}`);
    // Entrepierna
    cota({ x: 0, y: g.crY }, { x: 0, y: 0.4 }, col('entrepierna'), f('entrepierna'));
    add('entrepierna', -1, P(-g.thIn - 0.5, g.crY * 0.42), `${nombreDe('entrepierna')} ${fmt(m.entrepierna)}`);
  }
  function regla(g) {
    const x = W - 30, y0 = P(0, 0).y, f = activo === 'altura';
    ctx.save();
    ctx.strokeStyle = 'rgba(107,30,44,.35)'; ctx.fillStyle = '#6F5E57'; ctx.lineWidth = 1;
    ctx.font = '600 9.5px "Spectral", "EB Garamond", Georgia, serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, P(0, 210).y);
    for (let cm = 0; cm <= 210; cm += 5) {
      const y = P(0, cm).y, l = cm % 50 === 0 ? 10 : cm % 10 === 0 ? 6 : 3;
      ctx.moveTo(x, y); ctx.lineTo(x - l, y);
      if (cm % 50 === 0 && S > 1.2) ctx.fillText(E.unidades === 'in' ? Math.round(cm / 2.54) + '″' : cm, x - 13, y);
    }
    ctx.stroke();
    // Marca de estatura
    const yH = P(0, g.H).y;
    ctx.strokeStyle = AZUL; ctx.lineWidth = f ? 2 : 1.2; ctx.setLineDash([4, 4]); ctx.globalAlpha = f ? 0.9 : 0.45;
    ctx.beginPath(); ctx.moveTo(P(0, g.H).x, yH); ctx.lineTo(x, yH); ctx.stroke();
    ctx.restore();
    etiqueta({ x: x - 8, y: yH - 14, txt: fmt(objetivo().altura), color: AZUL, fuerte: f, alin: 'right' });
  }
  function etiqueta({ x, y, txt, color, fuerte, alin, punto }) {
    ctx.save();
    ctx.font = `${fuerte ? 700 : 600} 11px "Spectral", "EB Garamond", Georgia, serif`;
    const w = ctx.measureText(txt).width + (punto ? 26 : 16), h = 20;
    const x0 = alin === 'right' ? x - w : x;
    ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 10);
    ctx.fillStyle = fuerte ? color : 'rgba(255,255,255,.92)'; ctx.fill();
    ctx.strokeStyle = color; ctx.globalAlpha = fuerte ? 1 : 0.55; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
    if (punto) { ctx.fillStyle = fuerte ? '#fff' : color; ctx.beginPath(); ctx.arc(x0 + 11, y, 3.5, 0, 2 * PI); ctx.fill(); }
    ctx.fillStyle = fuerte ? '#fff' : '#3B1A1F'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x0 + (punto ? 19 : 8), y + 0.5);
    ctx.restore();
  }
  // Coloca etiquetas en dos columnas (izq./der.) sin que se encimen y las une a su punto con una guía.
  function ponerEtiquetas(lista) {
    const lx = Math.max(36, Math.min(50, (W / 2 - 120) / S));
    if (compacto()) {
      for (const e of lista) { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.ax, e.ay, e.fuerte ? 4 : 2.6, 0, 2 * PI); ctx.fill(); }
      const e = lista.find(x => x.fuerte);
      if (e) { ctx.font = '700 11px "Spectral", "EB Garamond", Georgia, serif'; const w = ctx.measureText(e.txt).width + (e.punto ? 26 : 16);
        etiqueta({ ...e, x: clamp(e.ax - w / 2, 8, W - w - 8), y: clamp(e.ay - 22, 16, Hc - 16), alin: 'left' }); }
      return;
    }
    for (const lado of [1, -1]) {
      const L = lista.filter(e => e.lado === lado).sort((a, b) => a.ay - b.ay);
      const gap = 23;
      let prev = -Infinity;
      for (const e of L) { e.y = Math.max(e.ay, prev + gap); prev = e.y; }
      let next = Hc - 20;
      for (let i = L.length - 1; i >= 0; i--) { L[i].y = Math.min(L[i].y, next); next = L[i].y - gap; }
      const x = OX + lado * lx * S;
      for (const e of L) {
        ctx.save(); ctx.strokeStyle = e.color; ctx.globalAlpha = e.fuerte ? 0.9 : 0.35; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(e.ax, e.ay); ctx.lineTo(x - lado * 10, e.y); ctx.lineTo(x, e.y); ctx.stroke();
        ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.ax, e.ay, 2.2, 0, 2 * PI); ctx.fill(); ctx.restore();
        etiqueta({ x, y: e.y, txt: e.txt, color: e.color, fuerte: e.fuerte, alin: lado < 0 ? 'right' : 'left', punto: e.punto });
      }
    }
  }
  // Puntos de ajuste de la camisa (columna izquierda con la cota de hombros… o derecha si las guías están apagadas)
  function llamadas(g, s, etq) {
    const st = s.st;
    const zonas = {
      cuello: { x: -s.nwC - 1, y: g.nbY + 2 },
      hombros: { x: -s.sx, y: s.sy },
      pecho: { x: -s.cW, y: g.chY },
      cintura: { x: -s.wW, y: g.waY },
      bajo: { x: -s.hW, y: s.hsY },
      manga: espejo(brazoEn(g, s.dCuff).c),
      largo: { x: -s.hW * 0.6, y: s.hemY + 1.4 }
    };
    for (const z of EV) {
      const p = P(zonas[z.id].x, zonas[z.id].y);
      etq.push({ id: 'z-' + z.id, lado: -1, ax: p.x, ay: p.y, txt: `${z.nombre} ${fmtDif(z.dif)} · ${z.txt}`, color: COLOR_ST[z.st], fuerte: activo === 'z-' + z.id, punto: true });
    }
  }

  // ---------------------------------------------------------------- Bucle
  let tPrev = performance.now();
  const t0 = tPrev - precalentar * 1000;
  function cuadro(now) {
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    const t = (now - t0) / 1000;
    const k = reducido ? 1 : 1 - Math.exp(-dt * 9);
    const tg = objetivo();
    for (const id of IDS) M[id] += (tg[id] - M[id]) * k;
    fem += ((E.sexo === 'm' ? 1 : 0) - fem) * k;
    const G = prendaActual();
    if (!GA) GA = { ...G };
    for (const key in G) if (typeof G[key] === 'number') GA[key] += (G[key] - GA[key]) * k;
    GA.corte = G.corte;
    vis = reducido ? (E.camisa.puesta ? 1 : 0) : clamp(vis + (E.camisa.puesta ? 1 : -1) * dt * 1.6, 0, 1);
    tIntro = reducido || precalentar ? 1 : Math.min(1, t / 1.6);
    dibujar(t);
    requestAnimationFrame(cuadro);
  }

  function dibujar(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hc);
    aplicarVista();
    const g = cuerpo(M, fem, t);
    pintarPiel(g);

    // Intro: el escáner revela el cuerpo de arriba abajo
    const yScan = lerp(g.H + 12, -6, 1 - Math.pow(1 - tIntro, 2));
    const ys = P(0, yScan).y;
    ctx.save();
    if (tIntro < 1) { ctx.beginPath(); ctx.rect(0, 0, W, ys); ctx.clip(); }

    dibujarCuerpo(g);
    const col = D.camisa.colores.find(c => c.id === E.camisa.color);
    let s = null;
    if (vis > 0.001) s = dibujarCamisa(g, GA, col);

    const etq = [];
    if (E.guias) { ctx.save(); ctx.globalAlpha = vis > 0.5 ? 0.75 : 1; guias(g, etq); ctx.restore(); }
    if (s && vis > 0.98) llamadas(g, s, etq);
    if (E.guias || (s && vis > 0.98)) ponerEtiquetas(etq);
    ctx.restore();
    if (E.guias) regla(g);

    // Haz del escáner (intro + barrido suave cada 7 s)
    const ciclo = (t % 7) / 2.4;
    const yb = tIntro < 1 ? ys : ciclo < 1 ? P(0, lerp(g.H + 4, -2, ciclo)).y : null;
    if (yb != null && !reducido) {
      const x1 = P(-48, 0).x, x2 = P(48, 0).x, a = tIntro < 1 ? 1 : 0.35 * Math.sin(ciclo * PI);
      const gr = ctx.createLinearGradient(0, yb - 28, 0, yb);
      gr.addColorStop(0, 'rgba(107,30,44,0)'); gr.addColorStop(1, `rgba(107,30,44,${0.14 * a})`);
      ctx.fillStyle = gr; ctx.fillRect(x1, yb - 28, x2 - x1, 28);
      const gl = ctx.createLinearGradient(x1, 0, x2, 0);
      gl.addColorStop(0, 'rgba(107,30,44,0)'); gl.addColorStop(0.5, `rgba(107,30,44,${0.8 * a})`); gl.addColorStop(1, 'rgba(107,30,44,0)');
      ctx.fillStyle = gl; ctx.fillRect(x1, yb - 0.75, x2 - x1, 1.5);
    }
  }

  // ---------------------------------------------------------------- Interfaz
  const aUnidad = cm => E.unidades === 'in' ? +(cm / 2.54).toFixed(1) : cm;
  const deUnidad = v => E.unidades === 'in' ? v * 2.54 : v;

  function moverPildora(seg) {
    const b = seg.querySelector('[aria-checked="true"]'), p = seg.querySelector('.pildora');
    if (!b || !p) return;
    if (!b.offsetWidth) return;
    if (!seg.dataset.listo) p.style.transition = 'none';
    p.style.width = b.offsetWidth + 'px';
    p.style.transform = `translateX(${b.offsetLeft}px)`;
    if (!seg.dataset.listo) { void p.offsetWidth; p.style.transition = ''; seg.dataset.listo = '1'; }
  }
  function segmentado(id, valor, alCambiar) {
    const seg = $(id);
    const marcar = v => { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === v))); moverPildora(seg); };
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { alCambiar(b.dataset.v); marcar(b.dataset.v); } });
    seg.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const bs = [...seg.querySelectorAll('button')], i = bs.findIndex(b => b.getAttribute('aria-checked') === 'true');
      const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
      n.click(); n.focus(); e.preventDefault();
    });
    marcar(valor);
    return marcar;
  }

  // Deslizadores
  function construirMedidas() {
    const grupos = [...new Set(D.medidas.map(m => m.grupo))];
    $('grupos').innerHTML = grupos.map(gr => `
      <div class="grupo"><div class="kicker">${esc(gr)}</div>
        ${D.medidas.filter(m => m.grupo === gr).map(m => `
          <div class="medida" data-id="${m.id}" title="${esc(m.ayuda)}">
            <label for="r-${m.id}"><span class="nom" id="nom-${m.id}">${esc(m.nombre)}</span>
              <span class="val"><input type="number" id="n-${m.id}" aria-label="${esc(m.nombre)}" inputmode="decimal"><em class="u">cm</em></span></label>
            <input type="range" id="r-${m.id}" min="${m.min}" max="${m.max}" step="${m.paso}">
          </div>`).join('')}
      </div>`).join('');
    for (const m of D.medidas) {
      const r = $('r-' + m.id), n = $('n-' + m.id), fila = r.closest('.medida');
      r.addEventListener('input', () => { fijar(m.id, +r.value); });
      n.addEventListener('change', () => { const v = parseFloat(n.value.replace(',', '.')); if (Number.isFinite(v)) fijar(m.id, deUnidad(v)); else pintarMedidas(); });
      n.addEventListener('keydown', e => { if (e.key === 'Enter') n.blur(); });
      for (const [ev, v] of [['mouseenter', m.id], ['focusin', m.id], ['mouseleave', null], ['focusout', null]])
        fila.addEventListener(ev, () => { activo = v; document.querySelectorAll('.medida').forEach(x => x.classList.toggle('activa', x.dataset.id === activo)); });
    }
  }
  function fijar(id, v) {
    objetivo()[id] = clamp(Math.round(v * 2) / 2, DEF[id].min, DEF[id].max);
    pintarMedidas(id); pintarPrenda(); guardar();
  }
  let tipoPrevio = '';
  function pintarMedidas(salvo) {
    const m = objetivo();
    for (const d of D.medidas) {
      const r = $('r-' + d.id), n = $('n-' + d.id);
      if (d.id !== salvo || document.activeElement !== r) r.value = m[d.id];
      r.style.setProperty('--p', ((m[d.id] - d.min) / (d.max - d.min) * 100) + '%');
      if (document.activeElement !== n) n.value = aUnidad(m[d.id]);
      n.step = E.unidades === 'in' ? 0.1 : d.paso;
      $('nom-' + d.id).textContent = nombreDe(d.id);
    }
    document.querySelectorAll('.medida .u').forEach(u => { u.textContent = E.unidades; });
    const tipo = tipoCuerpo(m), el = $('tipo');
    if (tipo !== tipoPrevio) { el.textContent = tipo; el.classList.remove('cambia'); void el.offsetWidth; el.classList.add('cambia'); tipoPrevio = tipo; }
    // ¿Coincide con un cuerpo predefinido?
    $('presets').querySelectorAll('[data-p]').forEach(b => {
      const p = D.presets[E.sexo].find(x => x.id === b.dataset.p);
      b.setAttribute('aria-pressed', String(!!p && IDS.every(id => p.v[id] === m[id])));
    });
  }
  function construirPresets() {
    $('presets').innerHTML = D.presets[E.sexo].map(p => `<button class="chip" data-p="${p.id}">${esc(p.nombre)}</button>`).join('') +
      '<button class="chip" data-p="" title="Medidas al azar, coherentes entre sí">Aleatorio</button>';
  }
  $('presets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const m = objetivo();
    if (b.dataset.p) Object.assign(m, D.presets[E.sexo].find(p => p.id === b.dataset.p).v);
    else {
      // Mezcla de dos cuerpos predefinidos con un poco de ruido
      const ps = D.presets[E.sexo], a = ps[Math.floor(Math.random() * ps.length)].v, c = ps[Math.floor(Math.random() * ps.length)].v, t = Math.random();
      for (const id of IDS) m[id] = clamp(Math.round((lerp(a[id], c[id], t) * (1 + (Math.random() - 0.5) * 0.06)) * 2) / 2, DEF[id].min, DEF[id].max);
    }
    pintarMedidas(); pintarPrenda(); guardar();
  });

  // Prenda
  function construirColores() {
    $('colores').innerHTML = D.camisa.colores.map(c => {
      const fondo = c.tela === 'rayas' ? 'repeating-linear-gradient(90deg,#b9d4f4 0 3px,#fff 3px 7px)' : c.tela;
      return `<button class="color" data-c="${c.id}" title="${esc(c.nombre)}"><i style="background:${fondo}"></i>${esc(c.nombre.split(' ·')[0])}</button>`;
    }).join('');
    $('colores').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { E.camisa.color = b.dataset.c; pintarPrenda(); guardar(); } });
  }
  $('tallas').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    E.camisa.talla = b.dataset.t === 'auto' ? null : +b.dataset.t;
    pintarPrenda(); guardar();
  });
  function ponerCamisa(v) {
    E.camisa.puesta = v; $('cPuesta').checked = v; $('bCamisa').setAttribute('aria-pressed', String(v)); guardar();
  }
  $('cPuesta').addEventListener('change', e => ponerCamisa(e.target.checked));
  $('bCamisa').addEventListener('click', () => ponerCamisa(!E.camisa.puesta));
  const ponerGuias = v => { E.guias = v; $('bGuias').setAttribute('aria-pressed', String(v)); guardar(); };
  $('bGuias').addEventListener('click', () => ponerGuias(!E.guias));

  function pintarPrenda() {
    const m = objetivo(), rec = recomendar(E.sexo, m, E.camisa.corte), G = prendaActual();
    EV = evaluar(E.sexo, m, G);
    $('colores').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === E.camisa.color)));
    $('tallaNota').textContent = `recomendada ${rec}${E.sexo === 'h' ? ' (cuello)' : ' (EU)'}`;
    $('tallas').innerHTML = `<button class="chip" data-t="auto" aria-pressed="${E.camisa.talla == null}" title="Sigue a las medidas en tiempo real">Auto · ${rec}</button>` +
      D.camisa.tallas[E.sexo].map(t => `<button class="chip${t === rec ? ' rec' : ''}" data-t="${t}" aria-pressed="${E.camisa.talla === t}">${t}</button>`).join('');

    const malas = EV.filter(z => z.st !== 'ok');
    const nombreT = `Talla ${G.talla} · ${G.corte === 'slim' ? 'Slim' : 'Regular'}`;
    $('veredicto').className = 'veredicto' + (malas.length ? ' mal' : '');
    $('veredicto').innerHTML = malas.length
      ? `${esc(nombreT)}: revisa ${malas.length === 1 ? 'una zona' : malas.length + ' zonas'}<small>${malas.map(z => esc(z.nombre + ' ' + z.txt.toLowerCase())).join(' · ')}</small>`
      : `✓ ${esc(nombreT)} te queda bien<small>Holgura correcta en las ${EV.length} zonas.</small>`;
    $('ajuste').innerHTML = EV.map(z => {
      const span = z.hi - z.lo, a = z.lo - span * 0.6, b = z.hi + span * 0.6, pos = v => clamp((v - a) / (b - a) * 100, 0, 100);
      const det = z.id === 'largo' ? `el bajo queda <strong>${fmt(Math.abs(z.dif))}</strong> ${z.dif >= 0 ? 'por debajo de' : 'por encima de'} la entrepierna`
        : `prenda <strong>${fmt(z.p, true)}</strong> · cuerpo <strong>${fmt(z.c)}</strong> · holgura <strong>${fmtDif(z.dif)}</strong>`;
      return `<div class="zona" data-z="${z.id}"><b>${esc(z.nombre)}</b><span class="st ${z.st}">${esc(z.txt)}</span>
        <span class="num">${det}</span>
        <span class="riel" title="Rango correcto: ${fmtDif(z.lo)} a ${fmtDif(z.hi)}"><span class="bien" style="left:${pos(z.lo)}%;right:${100 - pos(z.hi)}%"></span><span class="marca ${z.st}" style="left:${pos(z.dif)}%"></span></span></div>`;
    }).join('');
    const filas = [['Cuello', G.cuello], ['Pecho', G.pecho], ['Cintura', G.cintura], ['Bajo', G.bajo], ['Hombros', G.hombros], ['Manga (desde costura)', G.manga], ['Largo (desde cuello)', G.largo], ['Puño', G.puno]];
    $('ficha').innerHTML = `<table>${filas.map(([n, v]) => `<tr><td>${n}</td><td>${fmt(v, true)}</td></tr>`).join('')}</table>`;
  }
  $('ajuste').addEventListener('mouseover', e => { const z = e.target.closest('.zona'); activo = z ? 'z-' + z.dataset.z : null; marcarZona(); });
  $('ajuste').addEventListener('mouseleave', () => { activo = null; marcarZona(); });
  const marcarZona = () => document.querySelectorAll('.zona').forEach(z => z.classList.toggle('activa', activo === 'z-' + z.dataset.z));

  // Cabecera
  let marcarSexo;
  function cambiarSexo(v) {
    if (v === E.sexo) return;
    E.sexo = v;
    if (E.camisa.talla != null && !D.camisa.tallas[v].includes(E.camisa.talla)) E.camisa.talla = null;
    construirPresets(); pintarMedidas(); pintarPrenda(); guardar();
  }
  marcarSexo = segmentado('sexo', E.sexo, cambiarSexo);
  const marcarUnidades = segmentado('unidades', E.unidades, v => { E.unidades = v; pintarMedidas(); pintarPrenda(); guardar(); });
  const marcarCorte = segmentado('corte', E.camisa.corte, v => { E.camisa.corte = v; pintarPrenda(); guardar(); });
  $('bReset').addEventListener('click', () => {
    E.medidas[E.sexo] = promedio(E.sexo); E.camisa.talla = null;
    pintarMedidas(); pintarPrenda(); guardar();
  });
  $('bExportar').addEventListener('click', () => {
    const G = prendaActual();
    const datos = { formato: 'casasiego-dresser/1', fecha: new Date().toISOString(), sexo: E.sexo === 'h' ? 'caballero' : 'dama', unidades: 'cm',
      medidas: { ...objetivo() }, tipo: tipoCuerpo(objetivo()),
      camisa: { modelo: 'cuello italiano', color: E.camisa.color, ...G, recomendada: recomendar(E.sexo, objetivo(), E.camisa.corte) },
      ajuste: EV.map(({ id, nombre, dif, st, txt }) => ({ id, nombre, holgura: +dif.toFixed(1), estado: st, texto: txt })) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = `casasiego-dresser-${E.sexo === 'h' ? 'caballero' : 'dama'}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Vista: rueda, arrastre, doble clic, botones
  function zoomEn(mx, my, factor) {
    const z = clamp(vista.zoom * factor, 0.6, 4);
    const wx = (mx - OX) / S, wy = (OY - my) / S;
    vista.zoom = z; const b = base(), s = b.s0 * z;
    vista.px = mx - wx * s - b.ox0; vista.py = my + wy * s - b.oy0;
  }
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomEn(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  let arr = null;
  cv.addEventListener('pointerdown', e => { arr = { x: e.clientX, y: e.clientY, px: vista.px, py: vista.py }; cv.setPointerCapture(e.pointerId); cv.classList.add('arrastrando'); });
  cv.addEventListener('pointermove', e => { if (!arr) return; vista.px = arr.px + e.clientX - arr.x; vista.py = arr.py + e.clientY - arr.y; });
  const soltar = () => { arr = null; cv.classList.remove('arrastrando'); };
  cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
  const encuadrar = () => { vista.zoom = 1; vista.px = 0; vista.py = 0; };
  cv.addEventListener('dblclick', encuadrar);
  $('bEncuadre').addEventListener('click', encuadrar);
  $('bMas').addEventListener('click', () => zoomEn(W / 2, Hc / 2, 1.25));
  $('bMenos').addEventListener('click', () => zoomEn(W / 2, Hc / 2, 0.8));

  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { const v = E.sexo === 'h' ? 'm' : 'h'; cambiarSexo(v); marcarSexo(v); }
    else if (k === 'c') ponerCamisa(!E.camisa.puesta);
    else if (k === 'm') ponerGuias(!E.guias);
    else if (k === '0') encuadrar();
  });

  window.addEventListener('resize', () => { medir(); ['sexo', 'unidades', 'corte'].forEach(id => moverPildora($(id))); });
  if (document.fonts) document.fonts.ready.then(() => ['sexo', 'unidades', 'corte'].forEach(id => moverPildora($(id))));

  // ---------------------------------------------------------------- Arranque
  construirMedidas(); construirPresets(); construirColores();
  $('cPuesta').checked = E.camisa.puesta; $('bCamisa').setAttribute('aria-pressed', String(E.camisa.puesta));
  $('bGuias').setAttribute('aria-pressed', String(E.guias));
  pintarMedidas(); pintarPrenda();
  medir();
  void marcarUnidades; void marcarCorte;
  requestAnimationFrame(cuadro);
})();
