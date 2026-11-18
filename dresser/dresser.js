/* Dresser · Casa Siego (v1.7.0 · camisa a medida dentro del traje · un solo panel · render de sastrería: saco, chaleco y pantalón en Cuerpo y Galán · Enviar camisería + sastrería)
   Silueta de maniquí (hombre / mujer) que se deforma en tiempo real con las medidas de confección,
   y probador de una camisa de cuello italiano (blanca, azul celeste o azul marino) con reporte de ajuste por zona.
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

  const FIG = { tinta: '#4A1621', tintaRGB: '74,22,33', sombra: '107,30,44', cinta: '176,141,87', piel: ['#FBF7F0', '#F4ECDF', '#EADFCB'], madera: ['#3E2717', '#6B4428', '#A3744C'] };   // maniquí: lino marfil, tinta vino, cinta de latón
  const AZUL = '#6B1E2C', ROJO = '#e11d48', AMBAR = '#d97706';
  const COLOR_ST = { ok: AZUL, bajo: ROJO, alto: AMBAR };
  const CLAVE = 'casasiego-dresser/1';
  // Sastrería a medida en el maniquí (saco, chaleco, pantalón): telas de lana con su tejido, línea, detalle y botón.
  const TELAS_SASTRE = [
    { id: 'lana-gris',    nombre: 'Lana fría gris', base: '#9A9C9F', linea: '#45484C', det: 'rgba(36,38,42,.42)',    boton: '#2E2A26', trama: 'sarga',  tono: ['#A6A8AB', '#8C8E91'] },
    { id: 'marino',       nombre: 'Azul marino',    base: '#26324A', linea: '#0B1120', det: 'rgba(196,208,230,.38)', boton: '#1B1714', trama: 'micro',  tono: ['#2E3B55', '#1F2A40'] },
    { id: 'tweed-espiga', nombre: 'Tweed espiga',   base: '#8E8A82', linea: '#423E37', det: 'rgba(40,37,32,.42)',    boton: '#3A2A1E', trama: 'espiga', tono: ['#98948C', '#86827A'] },
    { id: 'carbon',       nombre: 'Gris carbón',    base: '#3B3D41', linea: '#121316', det: 'rgba(225,226,230,.30)', boton: '#151515', trama: 'sarga',  tono: ['#45474C', '#323438'] }
  ];
  const SASTRE_IDS = ['saco', 'chaleco', 'pantalon'];
  const IDS = D.medidas.map(m => m.id);
  const DEF = Object.fromEntries(D.medidas.map(m => [m.id, m]));
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- Estado
  const promedio = s => ({ ...D.presets[s].find(p => p.id === 'promedio').v });
  const inicial = () => ({
    sexo: 'h', unidades: 'cm', guias: true, maniqui: 'galan',
    medidas: { h: promedio('h'), m: promedio('m') },
    camisa: { puesta: true, color: 'blanca', corte: 'slim', talla: null },  // talla null = automática
    sastre: { saco: false, chaleco: false, pantalon: false, tela: 'carbon' }   // sastrería puesta en el maniquí
  });
  let E = inicial();
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (s && s.medidas) {
      if (s.sexo === 'h' || s.sexo === 'm') E.sexo = s.sexo;
      if (s.unidades === 'in') E.unidades = 'in';
      if (s.guias === false) E.guias = false;
      if (s.maniqui === 'cuerpo' || s.maniqui === 'galan') E.maniqui = s.maniqui;
      if (s.envio && typeof s.envio === 'object') E.envio = s.envio;
      for (const k of ['h', 'm']) for (const id of IDS) {
        const v = +(s.medidas[k] || {})[id];
        if (Number.isFinite(v)) E.medidas[k][id] = clamp(v, DEF[id].min, DEF[id].max);
      }
      const c = s.camisa || {};
      if (typeof c.puesta === 'boolean') E.camisa.puesta = c.puesta;
      if (D.camisa.colores.some(x => x.id === c.color)) E.camisa.color = c.color;
      if (c.corte === 'regular') E.camisa.corte = 'regular';
      if (D.camisa.tallas[E.sexo].includes(c.talla)) E.camisa.talla = c.talla;
      const so = s.sastre || {};
      for (const k of SASTRE_IDS) if (typeof so[k] === 'boolean') E.sastre[k] = so[k];
      if (TELAS_SASTRE.some(x => x.id === so.tela)) E.sastre.tela = so.tela;
    }
  } catch { /* sin almacenamiento: se queda el estado inicial */ }
  // URL: ?sexo=m · ?color=marino · ?talla=42 · ?corte=regular · ?t=5 (salta la intro: entra ya escaneado y vestido)
  const Q = new URLSearchParams(location.search);
  if (Q.get('sexo') === 'h' || Q.get('sexo') === 'm') E.sexo = Q.get('sexo');
  if (Q.get('maniqui') === 'cuerpo' || Q.get('maniqui') === 'galan') E.maniqui = Q.get('maniqui');
  if (D.camisa.colores.some(x => x.id === Q.get('color'))) E.camisa.color = Q.get('color');
  if (Q.get('corte') === 'slim' || Q.get('corte') === 'regular') E.camisa.corte = Q.get('corte');
  if (Q.has('talla')) E.camisa.talla = D.camisa.tallas[E.sexo].includes(+Q.get('talla')) ? +Q.get('talla') : null;
  // ?sastre=saco,chaleco,pantalon · ?tela=marino (sastrería puesta en el maniquí)
  if (Q.has('sastre')) { const l = Q.get('sastre').split(','); for (const k of SASTRE_IDS) E.sastre[k] = l.includes(k); }
  if (TELAS_SASTRE.some(x => x.id === Q.get('tela'))) E.sastre.tela = Q.get('tela');
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
  // Camisa a medida (talla «A medida», la de partida): cada zona sale de su medida del cuerpo + holgura del corte.
  // La cintura solo abre la parte baja; hombros y manga siguen a hombros y largo de brazo. talla = la de referencia.
  function prendaMedida(sexo, m, corte) {
    const slim = corte === 'slim', h = sexo === 'h';
    const crY = clamp(m.entrepierna, m.altura * 0.40, m.altura * 0.52), nb = m.altura * nbFrac(h ? 0 : 1);
    const holg = slim ? (h ? 8 : 6) : (h ? 14 : 10);
    return { sexo, talla: recomendar(sexo, m, corte), corte, medida: true,
      cuello: m.cuello + (h ? 1.5 : 2.5), hombros: m.hombros + 0.5, pecho: m.pecho + holg, cintura: m.cintura + holg,
      bajo: m.cadera + (slim ? 5 : 9), manga: m.brazo + 1.5, largo: nb - crY + (h ? 8 : 3), puno: m.muneca + (slim ? 6 : 7) };
  }
  const prendaActual = () => E.camisa.talla == null ? prendaMedida(E.sexo, objetivo(), E.camisa.corte) : prenda(E.sexo, E.camisa.talla, E.camisa.corte);
  const nombreTalla = G => `${E.camisa.talla == null ? 'A medida' : 'Talla ' + G.talla} · ${G.corte === 'slim' ? 'Slim' : 'Regular'}`;

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
    g.headH = H * L(0.118, 0.116);
    g.headW = g.headH * L(0.66, 0.63);
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
      if (c < 0) x *= 1 - 0.32 * Math.pow(-c, 1.5);
      pts.push({ x, y: cy + c * ry });
    }
    return pts;
  }
  function manoPts(g) {   // mano de maniquí: palma estilizada, dedos juntos y pulgar separado hacia dentro
    const l = g.handL, w = g.handW * 0.9, wd = g.wD;
    const p = (a, b) => ({ x: g.W.x + g.d2.x * l * a + g.n2.x * b, y: g.W.y + g.d2.y * l * a + g.n2.y * b });
    return [p(0.22, w * 0.5), p(0.5, w * 0.48), p(0.78, w * 0.36), p(0.95, w * 0.16), p(1.0, -w * 0.06), p(0.92, -w * 0.26),
            p(0.66, -w * 0.36), p(0.56, -w * 0.58), p(0.42, -w * 0.66), p(0.3, -w * 0.52), p(0.08, -wd * 0.55)];
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
  // lim: topes del chaleco o del saco puestos (la camisa se ajusta dentro, no los empuja) o null
  function camisaGeo(g, G, ev, lim) {
    const r = 0.7, s = {};
    const st = Object.fromEntries(ev.map(z => [z.id, z]));
    s.st = st;
    s.cerrado = st.cuello.st !== 'bajo';
    s.nwC = cuelloCamisa(g, G);
    const tope = (v, k, min) => lim && v > lim[k] ? Math.max(min, lerp(v, lim[k], lim.v)) : v;
    s.sx = tope(G.hombros / 2, 'sx', g.shX - 0.5);
    s.sy = g.shY + 0.6 - Math.max(0, s.sx - g.shX) * 0.8;
    s.cW = tope(Math.max(ancho(G.pecho, r) / 2, g.chW + 0.5), 'cW', g.chW + 0.3);
    s.wW = tope(Math.max(ancho(G.cintura, r) / 2, g.waW + 0.5), 'wW', g.waW + 0.3);
    s.hemY = g.nbY - G.largo;
    s.hsY = s.hemY + 7;
    s.hW = tope(Math.max(ancho(G.bajo, r) / 2, mitadEn(g, s.hsY) + 0.5), 'hW', mitadEn(g, s.hsY) + 0.3);
    s.hipW = tope(Math.max(lerp(s.wW, s.hW, 0.6), g.hiW + 0.5), 'hipW', g.hiW + 0.3);
    // Manga: se mide desde la costura del hombro.
    s.dEnd = G.manga + (s.sx - g.shX) * 0.9;
    s.exceso = Math.max(0, s.dEnd - g.brazo);
    s.dCuff = s.dEnd > g.brazo ? g.brazo + Math.min(s.exceso * 0.5, g.handL * 0.3) : s.dEnd;
    s.cuffW = Math.max(G.puno / PI * 1.12, g.wD + 0.8);
    s.ease = G.corte === 'slim' ? 1.06 : 1.16;
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
    dpr = Math.min(3, window.devicePixelRatio || 1);
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
    piel.addColorStop(0, FIG.piel[0]); piel.addColorStop(0.55, FIG.piel[1]); piel.addColorStop(1, FIG.piel[2]);
  }
  // Volumen de render: luz cenital a la izquierda, luz de contorno (rim) en el lado iluminado y sombra en el opuesto.
  function relleno(pts, g) {
    ctx.beginPath(); curva(pts, true); ctx.fillStyle = piel; ctx.fill();
    ctx.save(); ctx.clip(); ctx.lineJoin = 'round';
    const a = P(-40, g.H), b = P(40, 0), luz = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    luz.addColorStop(0, 'rgba(255,255,255,.65)'); luz.addColorStop(0.4, 'rgba(255,255,255,0)'); luz.addColorStop(1, `rgba(${FIG.sombra},.12)`);
    ctx.fillStyle = luz; ctx.fillRect(0, 0, W, Hc);
    const trazo = (dx, dy, color, ancho) => {
      ctx.save(); ctx.translate(dx * S, -dy * S); ctx.strokeStyle = color; ctx.lineWidth = ancho * S;
      ctx.beginPath(); curva(pts, true); ctx.stroke(); ctx.restore();
    };
    trazo(-1.1, 0.2, `rgba(${FIG.sombra},.10)`, 2.6);     // sombra del borde derecho
    trazo(0.7, -0.3, 'rgba(255,255,255,.75)', 1.1);        // luz de contorno del borde izquierdo
    ctx.strokeStyle = `rgba(${FIG.sombra},.05)`;
    for (const w of [3.6, 1.8]) { ctx.lineWidth = w * S; ctx.beginPath(); curva(pts, true); ctx.stroke(); }
    ctx.restore();
  }
  // Contorno de ilustración: halo suave + trazo fino a tinta.
  function contorno(pts, cerrar) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.08)`; ctx.lineWidth = 3.8; ctx.beginPath(); curva(pts, cerrar); ctx.stroke();
    ctx.strokeStyle = FIG.tinta; ctx.lineWidth = 1.15; ctx.beginPath(); curva(pts, cerrar); ctx.stroke();
    ctx.restore();
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
  const VS = Object.fromEntries(SASTRE_IDS.map(k => [k, precalentar && E.sastre[k] ? 1 : 0]));   // 0..1 saco, chaleco, pantalón puestos
  let activo = null;                   // medida o zona resaltada
  let tIntro = 0;
  let EV = [];                         // evaluación vigente (objetivo, no animada)

  function dibujarCuerpo(g) {
    // Suelo: sombra de contacto + sombra amplia, y línea de pasarela
    const sp = P(0, 0), rx = (g.cA + 16) * S;
    const gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rx);
    gr.addColorStop(0, `rgba(${FIG.tintaRGB},.18)`); gr.addColorStop(0.6, `rgba(${FIG.tintaRGB},.05)`); gr.addColorStop(1, `rgba(${FIG.tintaRGB},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx, rx * 0.1, 0, 0, 2 * PI); ctx.fill();
    ctx.fillStyle = `rgba(${FIG.tintaRGB},.16)`;
    for (const k of [1, -1]) { const f = P(g.cA * k, 0); ctx.beginPath(); ctx.ellipse(f.x, f.y, (g.anD + 3) * S, 0.9 * S, 0, 0, 2 * PI); ctx.fill(); }
    const l1 = P(-(g.cA + 32), 0), l2 = P(g.cA + 32, 0), gl = ctx.createLinearGradient(l1.x, 0, l2.x, 0);
    gl.addColorStop(0, `rgba(${FIG.cinta},0)`); gl.addColorStop(0.5, `rgba(${FIG.cinta},.75)`); gl.addColorStop(1, `rgba(${FIG.cinta},0)`);
    ctx.strokeStyle = gl; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l1.x, l1.y + 0.5); ctx.lineTo(l2.x, l2.y + 0.5); ctx.stroke();

    const sil = siluetaPts(g);
    relleno(sil, g);

    // Detalles del maniquí, recortados a la silueta
    ctx.save(); ctx.beginPath(); curva(sil, true); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // sombra del mentón sobre el cuello y sombras de los brazos sobre el torso
    const cb = P(0, g.chinY + 0.6), sr = g.nw * 1.5 * S, sg = ctx.createRadialGradient(cb.x, cb.y, 0, cb.x, cb.y, sr);
    sg.addColorStop(0, `rgba(${FIG.tintaRGB},.16)`); sg.addColorStop(1, `rgba(${FIG.tintaRGB},0)`);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cb.x, cb.y, sr, sr * 0.7, 0, 0, 2 * PI); ctx.fill();
    ctx.fillStyle = `rgba(${FIG.sombra},.09)`;
    for (const k of [1, -1]) { let pts = brazoPts(g).map(p => ({ x: p.x - 1.1, y: p.y - 0.6 })); if (k < 0) pts = pts.map(espejo); ctx.beginPath(); curva(pts, true); ctx.fill(); }
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.2)`; ctx.lineWidth = 1;
    ctx.beginPath(); linea({ x: 0, y: g.nbY - 1.5 }, { x: 0, y: g.crY + 3 }); ctx.stroke();          // centro frente
    for (const k of [1, -1]) {                                                                        // costuras princesa
      ctx.beginPath();
      curva([{ x: lerp(g.nw, g.shX, 0.5) * k, y: lerp(g.nbY, g.shY, 0.7) }, { x: g.chW * 0.5 * k, y: g.chY + 1.5 },
             { x: g.waW * 0.5 * k, y: g.waY }, { x: g.hiW * 0.56 * k, y: g.hiY - 4 }], false);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.24)`; ctx.beginPath();
    for (const k of [1, -1]) {
      const x = v => v * k;
      linea({ x: x(1.4), y: g.nbY - 1.2 }, { x: x(g.shX * 0.84), y: g.shY + 0.2 }, { x: x(g.shX * 0.45), y: g.nbY - 2.4 });    // clavícula
      linea({ x: x(g.hiW * 0.8), y: g.hiY + 3 }, { x: x(g.thIn + 1.5), y: g.crY + 2.5 }, { x: x(g.hiW * 0.42), y: g.hiY - 3 }); // ingle
      linea({ x: x(g.cK - g.knD * 0.18), y: g.knY - 0.5 }, { x: x(g.cK + g.knD * 0.18), y: g.knY - 0.5 }, { x: x(g.cK), y: g.knY - 1.8 }); // rodilla
    }
    ctx.stroke();
    // Pectoral (hombre) ↔ busto (mujer), mezclados por fem
    ctx.globalAlpha = 1 - fem; ctx.beginPath();
    for (const k of [1, -1]) linea({ x: 0.8 * k, y: g.chY - 2.5 }, { x: g.chW * 0.86 * k, y: g.chY - 0.6 }, { x: g.chW * 0.5 * k, y: g.chY - 4.4 });
    ctx.stroke();
    ctx.globalAlpha = fem; ctx.beginPath();
    const rb = (3.4 + clamp((g.m.pecho - g.m.cintura - 10) * 0.25, 0, 6)) * S;
    for (const k of [1, -1]) { const c = P(g.chW * 0.46 * k, g.chY + 0.8); ctx.moveTo(c.x + rb * Math.cos(0.12 * PI), c.y + rb * Math.sin(0.12 * PI)); ctx.arc(c.x, c.y, rb, 0.12 * PI, 0.88 * PI); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Cinta de medir en la cintura, con su marca al centro
    ctx.strokeStyle = `rgba(${FIG.cinta},.92)`; ctx.lineWidth = Math.max(1.4, 0.85 * S);
    ctx.beginPath(); linea({ x: -g.waW - 0.5, y: g.waY + 0.5 }, { x: g.waW + 0.5, y: g.waY + 0.5 }, { x: 0, y: g.waY - 0.9 }); ctx.stroke();
    const mk = P(0, g.waY - 0.2), mr = Math.max(2, 0.7 * S);
    ctx.fillStyle = FIG.tinta; ctx.beginPath(); ctx.moveTo(mk.x, mk.y - mr); ctx.lineTo(mk.x + mr * 0.7, mk.y); ctx.lineTo(mk.x, mk.y + mr); ctx.lineTo(mk.x - mr * 0.7, mk.y); ctx.closePath(); ctx.fill();
    ctx.restore();
    contorno(sil, true);

    // Cabeza de maniquí sin rasgos (y chongo con aro cuando es mujer)
    if (fem > 0.01) {
      ctx.save(); ctx.globalAlpha = fem;
      const c = P(0, g.H - g.headH * 0.02), r = g.headW * 0.25 * S * fem;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * PI); ctx.fillStyle = piel; ctx.fill();
      ctx.strokeStyle = FIG.tinta; ctx.lineWidth = 1.15; ctx.stroke();
      ctx.strokeStyle = `rgb(${FIG.cinta})`; ctx.lineWidth = Math.max(1.2, 0.5 * S);
      ctx.beginPath(); ctx.ellipse(c.x, c.y + r * 0.92, r * 0.62, r * 0.2, 0, 0, 2 * PI); ctx.stroke();
      ctx.restore();
    }
    const cab = cabezaPts(g);
    relleno(cab, g);
    const hc = P(-g.headW * 0.16, g.H - g.headH * 0.3), hr = g.headW * 0.3 * S, hl = ctx.createRadialGradient(hc.x, hc.y, 0, hc.x, hc.y, hr);
    hl.addColorStop(0, 'rgba(255,255,255,.7)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); curva(cab, true); ctx.clip(); ctx.fillStyle = hl; ctx.fillRect(hc.x - hr, hc.y - hr, hr * 2, hr * 2); ctx.restore();
    contorno(cab, true);

    dibujarBrazo(g, 1); dibujarBrazo(g, -1);
  }
  function dibujarBrazo(g, lado) {
    let pts = brazoPts(g);
    if (lado < 0) pts = pts.map(espejo);
    relleno(pts, g);
    contorno(pts, false);
  }

  function dibujarCamisa(g, G, col, remetida, lim) {   // remetida: y de la pretina (camisa fajada) o null
    const s = camisaGeo(g, G, EV, lim);
    const tela = col.tela === 'rayas' ? patronRayas() : col.tela;
    const torso = camisaPts(g, s);
    // Recorte: la camisa "baja" desde el cuello al ponerla.
    const top = g.H - g.headH * 0.4, corte = lerp(top, s.hemY - 4, vis < 1 ? 1 - Math.pow(1 - vis, 3) : 1);
    const yc = P(0, corte).y;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, yc); ctx.clip();

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1.5;
    if (remetida != null) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, P(0, remetida).y); ctx.clip(); }
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
    { const yH = lerp(g.waY, s.hemY, 0.55); pinzas(g, { cW: s.cW, wW: s.wW, xH: Math.max(s.hipW, mitadEn(g, yH) + 0.6), yH, hW: s.hW }, col); }
    for (const y of botones) boton({ x: 0, y }, col);

    if (remetida != null) ctx.restore();

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
  // ---------------------------------------------------------------- Galán de noche: busto de sastre sobre su mueble
  // Sin piernas ni brazos. Cuello, hombros, pecho, cintura y cadera salen de las medidas (mismo modelo g que el cuerpo).
  const galanBase = g => g.hiY - 5;                     // donde termina el busto y entra el poste
  function galanPts(g) {
    const yb = galanBase(g);
    const R = [
      { x: g.nw * 0.98, y: g.nbY + 7 },
      { x: g.nw, y: g.nbY + 1.5 },
      { x: lerp(g.nw, g.shX, 0.55), y: lerp(g.nbY, g.shY, 0.8) },
      { x: g.shX - 0.6, y: g.shY + 0.2 },
      { x: g.shX + 0.2, y: g.shY - 2.6 },               // cabeza del hombro, redondeada (sin brazo)
      { x: Math.max(g.chW + 0.6, g.shX - 1.2), y: g.apY - 1 },
      { x: g.chW, y: g.chY },
      { x: lerp(g.chW, g.waW, 0.55), y: lerp(g.chY, g.waY, 0.5) },
      { x: g.waW, y: g.waY },
      { x: lerp(g.waW, g.hiW, 0.72), y: lerp(g.waY, g.hiY, 0.55) },
      { x: g.hiW, y: g.hiY },
      { x: g.hiW * 0.9, y: yb + 1.6 },
      { x: 0, y: yb }
    ];
    return R.concat(R.slice(0, -1).map(espejo).reverse());
  }
  function veta(x1, x2) {                               // madera torneada: luz al centro izquierdo, sombra en los cantos
    const a = P(x1, 0).x, b = P(x2, 0).x, gr = ctx.createLinearGradient(a, 0, b, 0);
    gr.addColorStop(0, FIG.madera[0]); gr.addColorStop(0.32, FIG.madera[2]); gr.addColorStop(0.62, FIG.madera[1]); gr.addColorStop(1, FIG.madera[0]);
    return gr;
  }
  function pieza(x, y, w, h, r, relleno) {              // rectángulo redondeado en mundo (x, y = esquina inferior izquierda)
    const A = P(x, y + h);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(A.x, A.y, w * S, h * S, Math.min(r * S, w * S / 2, h * S / 2)); else ctx.rect(A.x, A.y, w * S, h * S);
    ctx.fillStyle = relleno || veta(x, x + w); ctx.fill();
    ctx.strokeStyle = FIG.tinta; ctx.lineWidth = 1.05; ctx.stroke();
  }
  function dibujarGalan(g) {
    const yb = galanBase(g), po = 1.7, bR = 23;
    // Suelo
    const sp = P(0, 0), rx = (bR + 12) * S, gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rx);
    gr.addColorStop(0, `rgba(${FIG.tintaRGB},.22)`); gr.addColorStop(0.65, `rgba(${FIG.tintaRGB},.05)`); gr.addColorStop(1, `rgba(${FIG.tintaRGB},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx, rx * 0.09, 0, 0, 2 * PI); ctx.fill();
    const l1 = P(-(bR + 30), 0), l2 = P(bR + 30, 0), gl = ctx.createLinearGradient(l1.x, 0, l2.x, 0);
    gl.addColorStop(0, `rgba(${FIG.cinta},0)`); gl.addColorStop(0.5, `rgba(${FIG.cinta},.75)`); gl.addColorStop(1, `rgba(${FIG.cinta},0)`);
    ctx.strokeStyle = gl; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l1.x, l1.y + 0.5); ctx.lineTo(l2.x, l2.y + 0.5); ctx.stroke();

    // Mueble: base de dos escalones con filo de latón, poste, vaciabolsillos y barra del pantalón
    ctx.lineJoin = 'round';
    pieza(-bR, 0, bR * 2, 3.2, 1.6);
    pieza(-bR * 0.7, 3.2, bR * 1.4, 2.6, 1.2);
    ctx.strokeStyle = `rgba(${FIG.cinta},.95)`; ctx.lineWidth = Math.max(1, 0.35 * S);
    ctx.beginPath(); linea({ x: -bR + 1.4, y: 3.05 }, { x: bR - 1.4, y: 3.05 }); ctx.stroke();
    pieza(-po, 5.6, po * 2, yb - 5.2, po);
    const yt = 30;                                                       // vaciabolsillos
    pieza(-po * 1.5, yt - 2.2, po * 3, 2.2, 0.6);
    pieza(-12, yt, 24, 3.6, 1.1);
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.35)`; ctx.lineWidth = 1; ctx.beginPath(); linea({ x: -10.6, y: yt + 2.9 }, { x: 10.6, y: yt + 2.9 }); ctx.stroke();
    ctx.fillStyle = `rgb(${FIG.cinta})`; ctx.beginPath(); const ti = P(0, yt + 1.6); ctx.arc(ti.x, ti.y, Math.max(1.4, 0.45 * S), 0, 2 * PI); ctx.fill();
    const yp = 56;                                                       // barra del pantalón
    pieza(-17, yp, 34, 2.4, 1.2);
    pieza(-po * 1.35, yp - 0.8, po * 2.7, 4, 0.8, `rgba(${FIG.cinta},.95)`);
    pieza(-po * 1.7, yb - 1.4, po * 3.4, 2.4, 0.8, `rgba(${FIG.cinta},.95)`);   // collarín donde entra el poste

    // Busto
    const pts = galanPts(g);
    relleno(pts, g);
    ctx.save(); ctx.beginPath(); curva(pts, true); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.2)`; ctx.lineWidth = 1;
    ctx.beginPath(); linea({ x: 0, y: g.nbY - 1.5 }, { x: 0, y: yb + 0.5 }); ctx.stroke();                   // centro frente
    for (const k of [1, -1]) {                                                                                  // costuras princesa
      ctx.beginPath();
      curva([{ x: lerp(g.nw, g.shX, 0.5) * k, y: lerp(g.nbY, g.shY, 0.7) }, { x: g.chW * 0.5 * k, y: g.chY + 1.5 },
             { x: g.waW * 0.5 * k, y: g.waY }, { x: g.hiW * 0.56 * k, y: yb + 0.5 }], false);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${FIG.tintaRGB},.24)`; ctx.beginPath();
    for (const k of [1, -1]) linea({ x: 1.4 * k, y: g.nbY - 1.2 }, { x: g.shX * 0.84 * k, y: g.shY + 0.2 }, { x: g.shX * 0.45 * k, y: g.nbY - 2.4 });
    ctx.stroke();
    ctx.globalAlpha = fem; ctx.beginPath();
    const rb = (3.4 + clamp((g.m.pecho - g.m.cintura - 10) * 0.25, 0, 6)) * S;
    for (const k of [1, -1]) { const c = P(g.chW * 0.46 * k, g.chY + 0.8); ctx.moveTo(c.x + rb * Math.cos(0.12 * PI), c.y + rb * Math.sin(0.12 * PI)); ctx.arc(c.x, c.y, rb, 0.12 * PI, 0.88 * PI); }
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(${FIG.cinta},.92)`; ctx.lineWidth = Math.max(1.4, 0.85 * S);                        // cinta en la cintura
    ctx.beginPath(); linea({ x: -g.waW - 0.5, y: g.waY + 0.5 }, { x: g.waW + 0.5, y: g.waY + 0.5 }, { x: 0, y: g.waY - 0.9 }); ctx.stroke();
    ctx.restore();
    // Tapas de sisa (madera) a los lados del hombro
    for (const k of [1, -1]) {
      const c = P((Math.max(g.chW, g.shX - 1.2) - 0.2) * k, lerp(g.shY, g.apY, 0.55)), ry = (g.shY - g.apY) * 0.42 * S, rxx = 1.15 * S;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, rxx, ry, 0, 0, 2 * PI); ctx.fillStyle = veta(-1.2, 1.2); ctx.fill();
      ctx.strokeStyle = FIG.tinta; ctx.lineWidth = 1; ctx.stroke();
    }
    contorno(pts, true);
    // Tapa del cuello y remate torneado
    const yc = g.nbY + 7;
    pieza(-g.nw * 1.04, yc - 0.5, g.nw * 2.08, 2.1, 1);
    pieza(-0.55, yc + 1.6, 1.1, 1.4, 0.3);
    const fi = P(0, yc + 4.1), fr = 1.35 * S, fg = ctx.createRadialGradient(fi.x - fr * 0.35, fi.y - fr * 0.35, 0, fi.x, fi.y, fr);
    fg.addColorStop(0, FIG.madera[2]); fg.addColorStop(1, FIG.madera[0]);
    ctx.beginPath(); ctx.arc(fi.x, fi.y, fr, 0, 2 * PI); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = FIG.tinta; ctx.lineWidth = 1; ctx.stroke();
  }

  // Camisa en el galán: corte recto (costados verticales del sobaco al bajo) y mangas que cuelgan con su puño.
  function dibujarCamisaGalan(g, G, col, remetida, lim) {   // remetida: y del bajo del saco (la camisa no asoma debajo) o null
    const s = camisaGeo(g, G, EV, lim);
    const tela = col.tela === 'rayas' ? patronRayas() : col.tela;
    // Caballero: corte recto. Dama: a medida, entallada — busto, cintura marcada, cadera y bajo curvo, con pinzas.
    // Recta: el costado baja del sobaco (ancho de pecho) al bajo; si crece la cintura solo gira hacia afuera la parte baja.
    const Rb = Math.max(s.cW, s.wW, s.hipW, s.hW) + 0.3, C = s.cW + 0.3, R = Rb;
    const yH = lerp(g.waY, s.hemY, 0.55), xH = Math.max(lerp(s.wW, s.hW, 0.65), mitadEn(g, yH) + 0.6);
    const dama = { cW: s.cW, wW: s.wW, xH, yH, hW: s.hW };
    const cab = [{ x: s.nwC, y: g.nbY + 3.4 }, { x: lerp(s.nwC, s.sx, 0.5), y: lerp(g.nbY + 2.6, s.sy, 0.62) }, { x: s.sx, y: s.sy }];
    const yB = s.hemY + 2.2, enLinea = y => lerp(C, Rb, clamp((g.chY - y) / Math.max(1, g.chY - yB), 0, 1));
    const tl = (x, k) => lim && x > lim[k] ? lerp(x, lim[k], lim.v) : x;   // dentro del chaleco / saco puestos
    const xw = tl(Math.max(enLinea(g.waY), s.wW + 0.3), 'wW'), xh = tl(Math.max(enLinea(yH), xH), 'hipW'), RbL = tl(Rb, 'hW');
    const recta = [...cab, { x: C + 0.4, y: g.apY - 0.6 }, { x: C, y: g.chY }, { x: xw, y: g.waY }, { x: xh, y: yH },
                   { x: RbL, y: yB }, { x: RbL - 0.9, y: s.hemY + 0.2 }, { x: 0, y: s.hemY }];
    const entallada = [...cab, { x: s.cW + 0.4, y: g.apY - 0.6 }, { x: s.cW, y: g.chY }, { x: s.wW, y: g.waY }, { x: xH, y: yH },
                   { x: s.hW, y: s.hemY + 5 }, { x: s.hW * 0.62, y: s.hemY + 1.4 }, { x: 0, y: s.hemY }];
    const half = recta.map((q, i) => ({ x: lerp(q.x, entallada[i].x, fem), y: lerp(q.y, entallada[i].y, fem) }));
    const Rm = lerp(C, s.cW, fem);                        // las mangas cuelgan del pecho: la cintura no las mueve
    s.cW = lerp(C, s.cW, fem); s.wW = lerp(xw, s.wW, fem); s.hipW = lerp(xh, xH, fem); s.hW = lerp(RbL, s.hW, fem);
    const torso = half.concat(half.slice(0, -1).map(espejo).reverse());
    const top = g.nbY + 12, corte = lerp(top, s.hemY - 8, vis < 1 ? 1 - Math.pow(1 - vis, 3) : 1);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, P(0, corte).y); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1.5;
    if (remetida != null) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, P(0, remetida).y); ctx.clip(); }
    ctx.beginPath(); curva(torso, true); ctx.fillStyle = tela; ctx.fill();
    const iz = P(-R, 0).x, de = P(R, 0).x, sh = ctx.createLinearGradient(iz, 0, de, 0);
    sh.addColorStop(0, col.sombra); sh.addColorStop(0.2, 'rgba(255,255,255,0)'); sh.addColorStop(0.8, 'rgba(255,255,255,0)'); sh.addColorStop(1, col.sombra);
    ctx.fillStyle = sh; ctx.fill(); ctx.stroke();
    if (!s.cerrado) {
      ctx.fillStyle = piel; ctx.beginPath();
      poli([{ x: -s.nwC * 0.8, y: g.nbY + 3.4 }, { x: s.nwC * 0.8, y: g.nbY + 3.4 }, { x: 2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }, { x: -2.4, y: g.nbY - 2.2 }]);
      ctx.fill();
      ctx.beginPath(); linea({ x: 2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }); linea({ x: -2.4, y: g.nbY - 2.2 }, { x: 0, y: g.nbY - 8 }); ctx.stroke();
    }
    ctx.strokeStyle = col.linea; ctx.lineWidth = 1; ctx.beginPath();
    for (const k of [1.5, -1.5]) linea({ x: k, y: s.boton0 }, { x: k, y: s.hemY + 0.3 });
    ctx.stroke();
    const paso = E.sexo === 'm' ? 8.5 : 9.5, botones = [];
    for (let y = s.boton0 - 6; y > s.hemY + 5; y -= paso) botones.push(y);
    pliegues(g, s, botones, col);
    pinzas(g, dama, col);
    for (const y of botones) boton({ x: 0, y }, col);
    if (remetida != null) ctx.restore();
    // Mangas colgando a los costados
    const yA = g.apY - 0.6, yCuff = s.sy - G.manga * 0.97, yCt = yCuff + 6;
    const cw = Math.min(clamp(G.puno / 2, 9, 15), lim ? lim.cw : 99), wT = Math.min(clamp(G.pecho * 0.17, 14, 22), lim ? lim.wT : 99);
    const telaPuno = col.cuello === '#ffffff' ? '#ffffff' : col.tela === 'rayas' ? patronRayas() : col.cuello;
    for (const lado of [1, -1]) {
      const X = p => lado < 0 ? espejo(p) : p;
      const m = [{ x: s.sx, y: s.sy }, { x: Rm + wT * 0.48, y: s.sy - 5 }, { x: Rm + wT * 0.6, y: lerp(s.sy, yCt, 0.45) },
                 { x: Rm + cw + 0.9, y: yCt }, { x: Rm + 0.5, y: yCt }, { x: Rm - 0.4, y: lerp(yA, yCt, 0.5) }, { x: Rm + 0.3, y: yA }].map(X);
      ctx.strokeStyle = col.linea; ctx.lineWidth = 1.5;
      ctx.beginPath(); curva(m, true); ctx.fillStyle = tela; ctx.fill(); ctx.fillStyle = col.sombra; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(74,22,33,.28)'; ctx.lineWidth = 1; ctx.beginPath();          // caída de la manga
      linea(X({ x: Rm + wT * 0.42, y: s.sy - 9 }), X({ x: Rm + cw * 0.55 + 0.6, y: yCt + 5 }), X({ x: Rm + wT * 0.4, y: lerp(s.sy, yCt, 0.6) }));
      linea(X({ x: Rm + 2, y: yA - 4 }), X({ x: Rm + 1.6, y: yCt + 9 }), X({ x: Rm + 1.2, y: lerp(yA, yCt, 0.5) }));
      ctx.stroke();
      const x0 = lado > 0 ? Rm + 0.5 : -(Rm + 0.5 + cw + 0.4), A = P(x0, yCt), w = (cw + 0.4) * S, h = 6 * S;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(A.x, A.y, w, h, 0.8 * S); else ctx.rect(A.x, A.y, w, h);
      ctx.fillStyle = telaPuno; ctx.fill(); ctx.strokeStyle = col.linea; ctx.lineWidth = 1.3; ctx.stroke();
      boton(X({ x: Rm + 0.5 + cw * 0.72, y: yCuff + 3 }), col);
    }
    s.manguilla = { x: Rm + 0.5 + cw / 2, y: yCuff + 3 };
    cuello(g, s, col);
    ctx.restore();
    return s;
  }

  // Pinzas de la camisa Dama a medida: dos verticales del busto a la cadera y una lateral de busto. Se ven según fem.
  function pinzas(g, d, col) {
    if (fem < 0.02) return;
    ctx.save(); ctx.globalAlpha = fem * 0.55; ctx.strokeStyle = col.linea; ctx.lineWidth = 1; ctx.setLineDash([3, 2.5]);
    for (const k of [1, -1]) {
      ctx.beginPath();
      curva([{ x: d.cW * 0.5 * k, y: g.chY - 2.5 }, { x: d.wW * 0.47 * k, y: g.waY }, { x: d.xH * 0.46 * k, y: d.yH + 1.5 }], false);
      ctx.stroke();
      ctx.beginPath(); linea({ x: (d.cW - 0.2) * k, y: g.chY - 3.5 }, { x: d.cW * 0.66 * k, y: g.chY - 1.8 }); ctx.stroke();
    }
    ctx.restore();
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

  // ---------------------------------------------------------------- Sastrería: pantalón, chaleco y saco (render)
  // A medida: se trazan con las medidas del cuerpo + holgura de sastre (sin tallas). En Cuerpo el pantalón va a la cintura
  // con la camisa fajada; en el Galán de noche el pantalón cuelga doblado de su barra y las mangas del saco caen a los costados.
  const tramas = {};
  function trama(t) {                                   // tela: color base + tejido (sarga, microtextura o espiga)
    if (tramas[t.id]) return tramas[t.id];
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const x = c.getContext('2d');
    x.fillStyle = t.base; x.fillRect(0, 0, 12, 12);
    if (t.trama === 'sarga') {
      x.strokeStyle = t.tono[1]; x.lineWidth = 1;
      for (let i = -12; i < 24; i += 3) { x.beginPath(); x.moveTo(i, 12); x.lineTo(i + 12, 0); x.stroke(); }
    } else if (t.trama === 'espiga') {
      x.lineWidth = 1.2;
      for (let i = 0; i < 12; i += 4) { x.strokeStyle = i % 8 ? t.tono[1] : t.tono[0]; x.beginPath(); x.moveTo(0, i + 4); x.lineTo(6, i); x.lineTo(12, i + 4); x.stroke(); }
    } else {
      x.fillStyle = t.tono[0]; for (let i = 0; i < 12; i += 4) for (let j = 0; j < 12; j += 4) x.fillRect(i, j, 2, 2);
      x.fillStyle = t.tono[1]; for (let i = 2; i < 12; i += 4) for (let j = 2; j < 12; j += 4) x.fillRect(i, j, 2, 2);
    }
    return (tramas[t.id] = ctx.createPattern(c, 'repeat'));
  }
  // Rellena el camino actual con la tela, volumen a los lados (iz → de), luz arriba y sombra abajo, y lo contornea.
  function vestir(t, iz, de, arriba, abajo) {
    ctx.fillStyle = trama(t); ctx.fill();
    const a = P(iz, 0).x, b = P(de, 0).x, gr = ctx.createLinearGradient(a, 0, b, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.24)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(0.4, 'rgba(255,255,255,.08)');
    gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = gr; ctx.fill();
    const y1 = P(0, arriba).y, y2 = P(0, abajo).y, gv = ctx.createLinearGradient(0, y1, 0, y2);
    gv.addColorStop(0, 'rgba(255,255,255,.10)'); gv.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = gv; ctx.fill();
    ctx.strokeStyle = t.linea; ctx.lineWidth = 1.4; ctx.stroke();
  }
  function botonSastre(p, t, r) {                       // botón de pasta con brillo
    const c = P(p.x, p.y), R = Math.max(1.4, (r || 0.8) * S);
    const gr = ctx.createRadialGradient(c.x - R * 0.35, c.y - R * 0.35, 0, c.x, c.y, R);
    gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(0.45, t.boton); gr.addColorStop(1, t.boton);
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, 2 * PI); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = t.linea; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function revelar(v, desde, hasta) {                   // la prenda "baja" al ponerla (recorte de arriba hacia abajo)
    const y = lerp(desde, hasta, v < 1 ? 1 - Math.pow(1 - v, 3) : 1);
    ctx.beginPath(); ctx.rect(0, 0, W, P(0, y).y); ctx.clip();
  }
  const telaSastre = () => TELAS_SASTRE.find(t => t.id === E.sastre.tela) || TELAS_SASTRE[0];

  // Pantalón en el cuerpo: tiro a la cintura, pierna recta con su quiebre sobre el zapato.
  function pantalonGeo(g) {
    const m = g.m, L = (a, b) => lerp(a, b, fem), p = {};
    p.top = g.waY + L(1.5, 0.5);
    p.wW = g.waW + 0.9;
    p.hW = g.hiW + 1.6;
    p.hw = clamp(m.muslo * L(0.17, 0.16) + 0.6, 8, 12.5);       // medio ancho del bajo
    p.kw = Math.max(g.knD / 2 + 2.4, p.hw + 0.6);                // medio ancho en la rodilla
    p.kc = Math.max(g.cK, p.kw + 0.4);                           // las piernas se tocan pero no se cruzan
    p.ac = Math.max(g.cA, p.hw + 0.4);
    p.hem = g.anY - 1;
    return p;
  }
  function pantalonPts(g, p) {
    const R = [
      { x: p.wW * 0.5, y: p.top },
      { x: p.wW, y: p.top },
      { x: lerp(p.wW, p.hW, 0.75), y: lerp(p.top, g.hiY, 0.6) },
      { x: p.hW, y: g.hiY },
      { x: Math.max(g.cM + g.thD * 0.43 + 1.9, p.hW * 0.98), y: g.mT },
      { x: p.kc + p.kw, y: g.knY },
      { x: p.ac + p.hw, y: p.hem + 0.7 },
      { x: p.ac + p.hw - 0.5, y: p.hem },
      { x: p.ac - p.hw + 0.5, y: p.hem },
      { x: p.ac - p.hw, y: p.hem + 0.7 },
      { x: p.kc - p.kw, y: g.knY },
      { x: Math.max(0.6, g.cM - g.thD * 0.45 - 1.3), y: g.mT },
      { x: Math.max(0.5, g.thIn - 0.4), y: g.crY - 3 },
      { x: 0, y: g.crY - 0.8 }
    ];
    return R.concat(R.slice(0, -1).map(espejo).reverse());
  }
  function dibujarPantalon(g, t, v) {
    const p = pantalonGeo(g), pts = pantalonPts(g, p);
    ctx.save(); revelar(v, p.top + 2, p.hem - 2);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); curva(pts, true); vestir(t, -p.hW - 6, p.hW + 6, p.top, p.hem);
    ctx.save(); ctx.clip();
    ctx.strokeStyle = t.det; ctx.lineWidth = 1;
    ctx.beginPath(); linea({ x: -p.wW - 1, y: p.top - 3.8 }, { x: p.wW + 1, y: p.top - 3.8 }); ctx.stroke();       // pretina
    for (const k of [1, -1]) {
      ctx.strokeStyle = t.det; ctx.lineWidth = 1; ctx.beginPath();
      linea({ x: (p.wW - 3.4) * k, y: p.top - 3.8 }, { x: (p.hW - 0.3) * k, y: p.top - 16 }, { x: (p.wW - 1.4) * k, y: p.top - 11 });   // bolsa al sesgo
      for (const f of [0.5, 0.92]) linea({ x: p.wW * f * k, y: p.top + 0.3 }, { x: p.wW * f * k, y: p.top - 4.8 });                // presillas
      linea({ x: (p.ac - p.hw * 0.85) * k, y: p.hem + 3.2 }, { x: (p.ac + p.hw * 0.85) * k, y: p.hem + 3.2 }, { x: p.ac * k, y: p.hem + 1.6 }); // quiebre
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.beginPath();                              // raya planchada
      curva([{ x: p.wW * 0.5 * k, y: p.top - 4.5 }, { x: lerp(p.wW * 0.5, p.kc, 0.55) * k, y: g.mT }, { x: p.kc * k, y: g.knY }, { x: p.ac * k, y: p.hem + 3.4 }], false);
      ctx.stroke();
    }
    ctx.strokeStyle = t.det; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath();                          // bragueta
    curva([{ x: -1.9, y: p.top - 3.8 }, { x: -1.9, y: g.crY + 7 }, { x: -0.2, y: g.crY + 2.2 }], false);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    botonSastre({ x: 0, y: p.top - 1.9 }, t, 0.55);
    ctx.restore();
    return p;
  }
  // Pantalón en el galán: doblado sobre la barra (frente = una pierna, detrás asoma la otra, más ancha en el muslo).
  function dibujarPantalonGalan(g, t, v) {
    const barra = 58.4, fin = 35.2, hw = clamp(g.m.muslo * 0.26, 12, 16.5);
    ctx.save(); revelar(v, barra + 1.5, fin - 1.5);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); poli([{ x: -hw - 1.3, y: barra + 0.6 }, { x: hw + 1.3, y: barra + 0.6 }, { x: hw + 2.4, y: fin - 1.3 }, { x: -hw - 2.4, y: fin - 1.3 }]);
    vestir(t, -hw - 3, hw + 3, barra, fin); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    const frente = [{ x: -hw - 0.6, y: barra - 0.6 }, { x: -hw + 1, y: barra + 1.3 }, { x: 0, y: barra + 1.6 }, { x: hw - 1, y: barra + 1.3 },
                    { x: hw + 0.6, y: barra - 0.6 }, { x: hw + 0.5, y: fin + 0.4 }, { x: hw - 0.2, y: fin }, { x: -hw + 0.2, y: fin }, { x: -hw - 0.5, y: fin + 0.4 }];
    ctx.beginPath(); curva(frente, true); vestir(t, -hw - 1, hw + 1, barra, fin);
    ctx.strokeStyle = t.det; ctx.lineWidth = 1; ctx.beginPath();
    linea({ x: -hw + 0.4, y: barra - 1.4 }, { x: hw - 0.4, y: barra - 1.4 }, { x: 0, y: barra - 2.2 });            // doblez sobre la barra
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.2; ctx.beginPath();
    linea({ x: hw * 0.32, y: barra - 2 }, { x: hw * 0.36, y: fin + 0.6 }); ctx.stroke();                            // raya planchada
    ctx.restore();
  }

  // Chaleco: escote en V, cinco botones, picos delanteros y bolsas de vivo. sh = camisa (para ajustar el escote) o null.
  function chalecoGeo(g, nwC) {                       // del cuerpo: la camisa se ajusta dentro, no al revés
    const L = (a, b) => lerp(a, b, fem), c = {};
    c.nx = nwC + 1.2; c.ny = g.nbY + 1.6;
    c.sx = g.shX - 3.4; c.sy = lerp(g.nbY, g.shY, clamp((c.sx - g.nw) / Math.max(1, g.shX - g.nw), 0, 1)) + 0.6;
    c.cw = g.chW + 1.4; c.ww = g.waW + 1.3;
    c.y1 = g.chY - L(5, 3);
    c.lado = g.waY - L(5, 4); c.pico = g.waY - L(12, 10); c.centro = g.waY - L(8.5, 7);
    c.px = Math.max(3, c.ww * 0.3);
    return c;
  }
  function dibujarChaleco(g, c, t, v) {
    ctx.save(); revelar(v, c.ny + 3, c.pico - 2);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const k of [-1, 1]) {                          // el delantero izquierdo (x > 0) monta sobre el derecho
      const X = p => ({ x: p.x * k, y: p.y }), fx = -k * 0.8, a = q => { const r = P(q.x, q.y); ctx.lineTo(r.x, r.y); };
      ctx.beginPath();
      curva([{ x: c.nx, y: c.ny }, { x: c.sx, y: c.sy }, { x: c.sx - 0.7, y: lerp(c.sy, g.apY, 0.55) }, { x: lerp(c.sx, c.cw, 0.5) - 0.9, y: g.apY - 1.2 },
             { x: c.cw, y: g.chY - 2.5 }, { x: lerp(c.cw, c.ww, 0.55), y: lerp(g.chY, g.waY, 0.5) }, { x: c.ww, y: g.waY }, { x: c.ww + 0.4, y: c.lado }].map(X), false);
      a({ x: c.px * k, y: c.pico }); a({ x: fx, y: c.centro }); a({ x: fx, y: c.y1 }); ctx.closePath();
      vestir(t, -c.ww - 2, c.ww + 2, c.ny, c.pico);
      ctx.save(); ctx.clip(); ctx.strokeStyle = t.det; ctx.lineWidth = 1;
      ctx.beginPath(); poli([X({ x: c.ww * 0.3, y: g.waY - 0.6 }), X({ x: c.ww * 0.76, y: g.waY + 0.2 }), X({ x: c.ww * 0.76, y: g.waY + 1.7 }), X({ x: c.ww * 0.3, y: g.waY + 0.9 })]); ctx.stroke();
      if (k > 0) { ctx.beginPath(); poli([{ x: c.cw * 0.42, y: g.chY - 3.4 }, { x: c.cw * 0.74, y: g.chY - 2.8 }, { x: c.cw * 0.74, y: g.chY - 1.5 }, { x: c.cw * 0.42, y: g.chY - 2.1 }]); ctx.stroke(); }
      ctx.setLineDash([2, 2]); ctx.beginPath(); linea(X({ x: Math.abs(fx) + 0.9, y: c.centro + 0.6 }), X({ x: Math.abs(fx) + 0.9, y: c.y1 - 0.6 })); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) botonSastre({ x: 0, y: lerp(c.y1 - 1.6, c.centro + 2.6, i / 4) }, t, 0.55);
    ctx.restore();
  }

  const largoSaco = g => g.nbY * lerp(0.5, 0.56, fem);   // largo del saco: media distancia del cuello al suelo
  // Saco: dos botones, solapa de muesca, bolsas con cartera y bolsa de pecho. En Cuerpo las mangas siguen al brazo
  // (dejan ver 1.5 cm del puño de la camisa); en el Galán cuelgan rectas a los costados.
  function sacoGeo(g, nwC) {
    const L = (a, b) => lerp(a, b, fem), m = g.m, j = {};
    j.nx = nwC + 0.9; j.ny = g.nbY + 3.2;
    j.sx = g.shX + L(1.6, 1.0); j.sy = g.shY + 0.9;                                   // hombrera
    j.cW = Math.max(ancho(m.pecho + L(12, 10), 0.6) / 2, g.chW + 2.2);
    j.wW = Math.max(ancho(m.cintura + L(10, 8), 0.62) / 2, g.waW + 1.8, j.cW * L(0.86, 0.8));
    j.hW = Math.max(ancho(m.cadera + 8, 0.62) / 2, g.hiW + 2.4, j.wW + 0.6);
    j.hem = largoSaco(g);
    j.b1 = g.waY - 1.2; j.b2 = j.b1 - 10;                                              // botón de cierre y botón de abajo
    j.qx = L(6, 5);
    j.wT = clamp(m.pecho * 0.19, 16, 24); j.fin = 14;                                  // mangas colgando en el galán
    j.finB = clamp(g.wD * 1.7, 10.5, 14);                                              // boca de manga sobre el brazo
    return j;
  }
  function dibujarSaco(g, j, sh, col, t, v, galan) {
    const L = (a, b) => lerp(a, b, fem), m = g.m;
    ctx.save(); revelar(v, g.nbY + 6, j.hem - 3);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const k of [-1, 1]) {                          // delantero izquierdo (x > 0) encima, con el ojal en la solapa
      const X = p => ({ x: p.x * k, y: p.y }), fx = -k * 1.0, a = q => { const r = P(q.x, q.y); ctx.lineTo(r.x, r.y); };
      const roll = y => ({ x: lerp(fx, k * j.nx, (y - j.b1) / (j.ny - j.b1)), y });
      ctx.beginPath();
      curva([{ x: j.nx, y: j.ny }, { x: lerp(j.nx, j.sx, 0.5), y: lerp(j.ny, j.sy, 0.6) + 0.5 }, { x: j.sx, y: j.sy }, { x: j.cW + 0.5, y: g.apY - 0.5 },
             { x: j.cW, y: g.chY }, { x: j.wW, y: g.waY }, { x: j.hW, y: Math.max(g.hiY, j.hem + 6) }, { x: j.hW + 0.2, y: j.hem + 1.6 }].map(X), false);
      a({ x: (j.hW - 0.8) * k, y: j.hem }); a({ x: j.qx * k, y: j.hem + 0.6 });
      const c1 = P(lerp(fx, j.qx * k, 0.15), lerp(j.hem, j.b2, 0.55)), e1 = P(fx, j.b2 - 1.2);
      ctx.quadraticCurveTo(c1.x, c1.y, e1.x, e1.y);
      a({ x: fx, y: j.b1 }); ctx.closePath();
      vestir(t, -j.hW - 2, j.hW + 2, j.ny, j.hem);
      ctx.save(); ctx.clip(); ctx.strokeStyle = t.det; ctx.lineWidth = 1;
      ctx.beginPath(); linea(X({ x: j.cW * 0.42, y: g.chY - 3 }), X({ x: j.wW * 0.46, y: g.waY - 7 })); ctx.stroke();      // pinza
      const yb = g.waY - 7.5, x0 = j.hW * 0.3, x1 = j.hW * 0.94;                                                         // bolsa con cartera
      ctx.beginPath(); poli([X({ x: x0, y: yb }), X({ x: x1, y: yb - 0.7 }), X({ x: x1 - 0.2, y: yb - 5.6 }), X({ x: x0 + 0.2, y: yb - 5 })]);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill(); ctx.strokeStyle = t.linea; ctx.stroke();
      if (k > 0) {                                                                                                      // bolsa de pecho
        const xa = Math.abs(roll(g.chY + 1).x) + L(9.5, 8.5), xb = Math.min(xa + 8.5, j.cW - 1.2);
        if (xb - xa > 4) { ctx.beginPath(); poli([{ x: xa, y: g.chY + 0.2 }, { x: xb, y: g.chY + 1.3 }, { x: xb, y: g.chY + 3.6 }, { x: xa, y: g.chY + 2.5 }]); ctx.strokeStyle = t.linea; ctx.stroke(); }
      }
      ctx.restore();
      const yW = g.chY + 2.5, yN = g.nbY - 6.5, B = { x: fx, y: j.b1 };                                                 // solapa de muesca
      ctx.beginPath();
      poli([B, { x: roll(yW).x + k * L(8, 7), y: yW }, { x: roll(yN).x + k * 5.6, y: yN }, { x: roll(yN).x + k * 3.6, y: yN + 1.5 },
            { x: k * (j.nx + 2.6), y: j.ny - 1.2 }, { x: k * j.nx, y: j.ny }]);
      ctx.fillStyle = trama(t); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      ctx.strokeStyle = t.linea; ctx.lineWidth = 1.3; ctx.stroke();
      if (k > 0) { ctx.strokeStyle = t.det; ctx.lineWidth = 1.2; ctx.beginPath(); linea({ x: roll(yN - 4).x + 2.2, y: yN - 4.4 }, { x: roll(yN - 4).x + 4.2, y: yN - 4 }); ctx.stroke(); }   // ojal
    }
    for (const y of [j.b1, j.b2]) botonSastre({ x: 0, y }, t, 0.85);

    if (galan) {                                        // mangas colgando a los costados del galán
      const Rs = j.cW, wT = j.wT, fin = j.fin, yA = g.apY - 0.5;
      const yEnd = j.sy - (g.brazo + (j.sx - g.shX) * 0.9 - 1.6) * 0.97;
      for (const k of [1, -1]) {
        const X = p => k < 0 ? espejo(p) : p;
        const pts = [{ x: j.sx, y: j.sy }, { x: Rs + wT * 0.5, y: j.sy - 5 }, { x: Rs + wT * 0.62, y: lerp(j.sy, yEnd, 0.45) },
                     { x: Rs + fin + 0.6, y: yEnd }, { x: Rs - 0.6, y: yEnd }, { x: Rs - 1.8, y: lerp(yA, yEnd, 0.5) }, { x: Rs - 0.6, y: yA }].map(X);   // cubre la manga de la camisa
        ctx.beginPath(); curva(pts, true); vestir(t, k > 0 ? Rs - 1 : -Rs - fin - 2, k > 0 ? Rs + fin + 2 : -Rs + 1, j.sy, yEnd);
        ctx.strokeStyle = t.det; ctx.lineWidth = 1; ctx.beginPath();
        linea(X({ x: Rs + wT * 0.4, y: j.sy - 9 }), X({ x: Rs + fin * 0.55 + 0.6, y: yEnd + 5 }), X({ x: Rs + wT * 0.4, y: lerp(j.sy, yEnd, 0.6) }));
        ctx.stroke();
        for (let i = 0; i < 3; i++) botonSastre(X({ x: Rs + fin - 1.8 - i * 1.5, y: yEnd + 2.4 }), t, 0.42);
      }
    } else {                                            // mangas sobre el brazo: se redibuja el brazo, el puño de la camisa y encima la manga
      const dEnd = g.brazo - 1.6, d0 = g.ua * 0.1 + 3, N = 8, fin = j.finB;
      const sw = d => lerp(anchoBrazo(g, d) * 1.3 + 1.6, fin, suave(g.ua * 0.45, dEnd, d));
      for (const k of [1, -1]) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, P(0, g.waY).y, W, Hc); ctx.clip();   // solo antebrazo y mano: el hombro queda bajo la manga
        dibujarBrazo(g, k);
        if (sh) puno(g, sh, k, col);
        ctx.restore();
        const out = [{ x: j.sx + 0.3, y: j.sy + 0.2 }], inn = [];
        for (let i = 0; i <= N; i++) { const d = lerp(d0, dEnd, i / N), { c, n } = brazoEn(g, d); out.push(off(c, n, sw(d) / 2 * (d < g.ua * 0.4 ? 1.04 : 1))); }
        for (let i = N; i >= 0; i--) { const d = lerp(g.ua * 0.36, dEnd, i / N), { c, n } = brazoEn(g, d); inn.push(off(c, n, -sw(d) / 2)); }
        let pts = [...out, ...inn, { x: j.cW + 0.5, y: g.apY - 0.5 }, { x: j.sx - 1.4, y: lerp(j.sy, g.apY, 0.55) }];
        if (k < 0) pts = pts.map(espejo);
        ctx.beginPath(); curva(pts, true);
        vestir(t, k > 0 ? j.cW - 2 : -j.cW - 16, k > 0 ? j.cW + 16 : -j.cW + 2, j.sy, j.sy - g.brazo);
        for (let i = 0; i < 3; i++) {
          const d = dEnd - 1.8 - i * 1.6, { c, n } = brazoEn(g, d), q = off(c, n, sw(d) / 2 - 1.1);
          botonSastre(k < 0 ? espejo(q) : q, t, 0.42);
        }
      }
    }
    ctx.restore();
  }

  // La camisa se ajusta dentro del chaleco y del saco puestos: tope por zona (medio ancho), aplicado según se ponen (v).
  const cuelloCamisa = (g, G) => Math.max(g.nw + 0.8, ancho(G.cuello, 0.95) / 2 + 0.3);
  function limitesCamisa(ch, sa) {
    if (!ch && !sa) return null;
    const I = Infinity, L = { sx: I, cW: I, wW: I, hipW: I, hW: I, wT: I, cw: I, v: Math.max(ch ? VS.chaleco : 0, sa ? VS.saco : 0) };
    if (ch) { L.cW = ch.cw - 0.6; L.wW = ch.ww - 0.6; }
    if (sa) {
      L.sx = sa.sx - 0.8; L.cW = Math.min(L.cW, sa.cW - 1.2); L.wW = Math.min(L.wW, sa.wW - 1.2);
      L.hipW = sa.hW - 1.2; L.hW = sa.hW - 1.2; L.wT = sa.wT - 1.5; L.cw = sa.fin - 1.5;
    }
    return L;
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
    const galan = E.maniqui === 'galan';
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
      if (galan && id === 'muslo') continue;
      anillo(cx, cy, rx, rx * k, 0, col(id), f(id));
      add(id, 1, P(cx + rx, cy), `${nombreDe(id)} ${fmt(m[id])}`);
    }
    if (!galan) for (const [id, d] of [['biceps', g.ua * 0.58], ['muneca', g.brazo - 1]]) {
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
    if (galan) return;
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
      manga: s.manguilla ? espejo(s.manguilla) : espejo(brazoEn(g, s.dCuff).c),
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
    for (const s of SASTRE_IDS) VS[s] = reducido ? (E.sastre[s] ? 1 : 0) : clamp(VS[s] + (E.sastre[s] ? 1 : -1) * dt * 1.6, 0, 1);
    tIntro = reducido || precalentar ? 1 : Math.min(1, t / 1.6);
    dibujar(t);
    requestAnimationFrame(cuadro);
  }

  function dibujar(t) {
    const caja = cv.parentElement;   // la escena cambia de tamaño al abrir o plegar los menús: volver a medir el lienzo
    if (Math.abs(caja.clientWidth - W) > 1 || Math.abs(caja.clientHeight - Hc) > 1 || dpr !== Math.min(3, window.devicePixelRatio || 1)) medir();
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

    const galan = E.maniqui === 'galan';
    if (galan) dibujarGalan(g); else dibujarCuerpo(g);
    const col = D.camisa.colores.find(c => c.id === E.camisa.color), tS = telaSastre();
    // Orden de vestir: pantalón (en el galán, en su barra) → camisa (fajada si hay pantalón) → chaleco → saco
    let pa = null;
    if (VS.pantalon > 0.001) { if (galan) dibujarPantalonGalan(g, tS, VS.pantalon); else pa = dibujarPantalon(g, tS, VS.pantalon); }
    // Chaleco y saco salen del cuerpo; la camisa se ajusta dentro de ellos (lim) para no salirse.
    const nwC = cuelloCamisa(g, GA);
    const ch = VS.chaleco > 0.001 ? chalecoGeo(g, nwC) : null, sa = VS.saco > 0.001 ? sacoGeo(g, nwC) : null;
    const lim = vis > 0.001 ? limitesCamisa(ch, sa) : null;
    let s = null;
    if (vis > 0.001) s = galan ? dibujarCamisaGalan(g, GA, col, VS.saco > 0.5 ? largoSaco(g) + 1 : null, lim) : dibujarCamisa(g, GA, col, pa && VS.pantalon > 0.5 ? pa.top + 0.3 : null, lim);
    if (ch) dibujarChaleco(g, ch, tS, VS.chaleco);
    if (sa) dibujarSaco(g, sa, vis > 0.5 ? s : null, col, tS, VS.saco, galan);

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
      return `<button class="color" data-c="${c.id}" title="${esc(c.nombre)}"><i style="background:${fondo}"></i>${esc(c.nombre)}</button>`;
    }).join('');
    $('colores').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { E.camisa.color = b.dataset.c; pintarPrenda(); guardar(); } });
  }
  $('tallas').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    E.camisa.talla = b.dataset.t === 'auto' ? null : +b.dataset.t;
    pintarPrenda(); guardar();
  });
  function ponerCamisa(v) {
    E.camisa.puesta = v; pintarSastre(); guardar();
  }
  const ponerGuias = v => { E.guias = v; $('bGuias').setAttribute('aria-pressed', String(v)); guardar(); };
  $('bGuias').addEventListener('click', () => ponerGuias(!E.guias));

  function pintarPrenda() {
    const m = objetivo(), rec = recomendar(E.sexo, m, E.camisa.corte), G = prendaActual();
    EV = evaluar(E.sexo, m, G);
    $('colores').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === E.camisa.color)));
    $('tallaNota').textContent = `referencia ${rec}${E.sexo === 'h' ? ' (cuello)' : ' (EU)'}`;
    $('tallas').innerHTML = `<button class="chip" data-t="auto" aria-pressed="${E.camisa.talla == null}" title="Cada zona con su medida + holgura del corte">A medida</button>` +
      D.camisa.tallas[E.sexo].map(t => `<button class="chip${t === rec ? ' rec' : ''}" data-t="${t}" aria-pressed="${E.camisa.talla === t}">${t}</button>`).join('');

    const malas = EV.filter(z => z.st !== 'ok');
    const nombreT = nombreTalla(G);
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
    // Ficha técnica: camisa (talla elegida o a medida) y, si están puestas, las piezas del traje con su holgura de sastre.
    const f = E.sexo === 'm' ? 1 : 0, L = (a, b) => lerp(a, b, f), nb = m.altura * nbFrac(f);
    const hw = clamp(m.muslo * L(0.17, 0.16) + 0.6, 8, 12.5);
    const piezas = [
      [`Camisa · ${nombreTalla(G)}`, [['Cuello', G.cuello], [nombreDe('pecho'), G.pecho], ['Cintura', G.cintura], ['Bajo', G.bajo], ['Hombros', G.hombros], ['Manga (desde costura)', G.manga], ['Largo (desde cuello)', G.largo], ['Puño', G.puno]]],
      E.sastre.saco && [`Saco · ${telaSastre().nombre}`, [[nombreDe('pecho'), m.pecho + L(12, 10)], ['Cintura', m.cintura + L(10, 8)], ['Cadera', m.cadera + 8], ['Hombros', m.hombros + L(3.2, 2)], ['Manga', m.brazo - 1.6], ['Largo (desde cuello)', nb * (1 - L(0.5, 0.56))]]],
      E.sastre.chaleco && [`Chaleco · ${telaSastre().nombre}`, [[nombreDe('pecho'), m.pecho + 9], ['Cintura', m.cintura + 8]]],
      E.sastre.pantalon && [`Pantalón · ${telaSastre().nombre}`, [['Cintura', m.cintura + 2], ['Cadera', m.cadera + 6], ['Entrepierna', m.entrepierna - 1], ['Bajo (contorno)', 4 * hw]]]
    ].filter(Boolean);
    $('ficha').innerHTML = piezas.map(([t, filas]) => `<p class="ficha__t">${esc(t)}</p><table>${filas.map(([n, v]) => `<tr><td>${n}</td><td>${fmt(v, true)}</td></tr>`).join('')}</table>`).join('');
  }
  $('ajuste').addEventListener('mouseover', e => { const z = e.target.closest('.zona'); activo = z ? 'z-' + z.dataset.z : null; marcarZona(); });
  $('ajuste').addEventListener('mouseleave', () => { activo = null; marcarZona(); });
  const marcarZona = () => document.querySelectorAll('.zona').forEach(z => z.classList.toggle('activa', activo === 'z-' + z.dataset.z));

  // Prendas en el maniquí: un solo menú bajo «Camisa» con casillas (camisa, saco, chaleco, pantalón) y Traje 2 / 3 piezas.
  const PRENDAS_RENDER = [['camisa', 'Camisa', 'C'], ['saco', 'Saco', 'S'], ['chaleco', 'Chaleco', 'K'], ['pantalon', 'Pantalón', 'N']];
  const puesta = k => k === 'camisa' ? E.camisa.puesta : !!E.sastre[k];
  function construirSastre() {
    $('sastrePrendas').innerHTML =
      '<div class="traje" role="group" aria-label="Traje"><span>Traje</span>' +
      '<button type="button" class="chip" data-traje="2" title="Saco y pantalón">2 piezas</button>' +
      '<button type="button" class="chip" data-traje="3" title="Saco, chaleco y pantalón">3 piezas</button></div>' +
      PRENDAS_RENDER.map(([id, n, t]) => `<label class="check"><input type="checkbox" data-s="${id}"><span>${n}</span><kbd>${t}</kbd></label>`).join('');
    $('sastreTelas').innerHTML = TELAS_SASTRE.map(t => `<button class="color" data-t="${t.id}" title="${esc(t.nombre)}"><i style="background:${t.base}"></i>${esc(t.nombre)}</button>`).join('');
    $('sastrePrendas').addEventListener('change', e => {
      const k = e.target.dataset.s; if (!k) return;
      if (k === 'camisa') ponerCamisa(e.target.checked); else ponerSastre(k, e.target.checked);
    });
    $('sastrePrendas').addEventListener('click', e => {
      const b = e.target.closest('[data-traje]'); if (!b) return;
      E.sastre.saco = true; E.sastre.pantalon = true; E.sastre.chaleco = b.dataset.traje === '3';
      pintarSastre(); pintarPrenda(); guardar();
    });
    $('sastreTelas').addEventListener('click', e => { const b = e.target.closest('button'); if (b) elegirTelaSastre(b.dataset.t); });
    const menu = $('prendasMenu'), btn = $('bPrendas');
    const abrir = v => { menu.classList.toggle('abierto', v); btn.setAttribute('aria-expanded', String(v)); };
    btn.addEventListener('click', () => abrir(!menu.classList.contains('abierto')));
    document.addEventListener('click', e => { if (!menu.contains(e.target)) abrir(false); });
    menu.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('abierto')) { abrir(false); btn.focus(); e.stopPropagation(); } });
    pintarSastre();
  }
  function pintarSastre() {
    $('sastrePrendas').querySelectorAll('input[data-s]').forEach(i => { i.checked = puesta(i.dataset.s); });
    const traje = E.sastre.saco && E.sastre.pantalon ? (E.sastre.chaleco ? '3' : '2') : '';
    $('sastrePrendas').querySelectorAll('[data-traje]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.traje === traje)));
    $('sastreTelas').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === E.sastre.tela)));
    const on = PRENDAS_RENDER.filter(([k]) => puesta(k)).map(([, n]) => n);
    $('prendasResumen').textContent = traje ? `Traje ${traje} piezas${E.camisa.puesta ? ' + camisa' : ''}` : on.length ? on.join(' · ') : 'Ninguna prenda';
  }
  function ponerSastre(k, v) { E.sastre[k] = v; pintarSastre(); pintarPrenda(); guardar(); }
  function elegirTelaSastre(id) { E.sastre.tela = id; pintarSastre(); if (E.envio) { E.envio.telaSastre = id; selTelaSastre.poner(id); pintarEnvio(); } guardar(); }

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
  const marcarManiqui = segmentado('maniqui', E.maniqui, v => { E.maniqui = v; guardar(); });
  $('bReset').addEventListener('click', () => {
    E.medidas[E.sexo] = promedio(E.sexo); E.camisa.talla = null;
    pintarMedidas(); pintarPrenda(); guardar();
  });
  // ---------------------------------------------------------------- Enviar: cotización por correo con archivo de medidas
  // Con sesión (Supabase del sitio, sb-*-auth-token): nombre y correo salen de la cuenta. Sin sesión: nombre y WhatsApp obligatorios.
  // Un sitio estático no puede adjuntar a un mailto: se descarga el archivo y se abre el correo ya escrito; donde el
  // navegador comparte archivos (móvil), «Compartir con archivo» lo manda adjunto a la app de correo.
  const ENV = D.envio;
  const porId = (lista, id) => lista.find(x => x.id === id) || lista[0];
  {
    const v = E.envio && typeof E.envio === 'object' ? E.envio : {};
    E.envio = {
      prenda: porId(ENV.prendas, v.prenda).id, tela: porId(ENV.telas, v.tela).id,
      cantidad: clamp(Math.round(Number.isFinite(+v.cantidad) ? +v.cantidad : 1), 0, 20),
      sastre: Object.fromEntries(ENV.sastreria.map(p => [p.id, clamp(Math.round(+((v.sastre || {})[p.id]) || 0), 0, 20)])),
      telaSastre: porId(ENV.telasSastreria, v.telaSastre || E.sastre.tela).id,
      nombre: String(v.nombre || '').slice(0, 80), whatsapp: String(v.whatsapp || '').slice(0, 20)
    };
    if (!E.envio.cantidad && !Object.values(E.envio.sastre).some(Boolean)) E.envio.cantidad = 1;   // siempre al menos una prenda
  }
  function sesionSitio() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!/^sb-[a-z0-9]+-auth-token$/.test(k)) continue;
        const v = JSON.parse(localStorage.getItem(k)) || {};
        if (v.refresh_token && v.user) return v.user;
      }
    } catch { /* sin almacenamiento */ }
    return null;
  }
  const soloDigitos = t => String(t).replace(/\D/g, '');
  const whatsValido = t => { const n = soloDigitos(t).length; return n >= 10 && n <= 15; };

  function miniPrenda(o) {
    const cuello = {
      italiano: '<path d="M18 9 11 15l8-1zM26 9l7 6-8-1z" class="c"/>',
      ingles: '<path d="M18.5 9 16 18.5l4.6-4.6zM25.5 9 28 18.5l-4.6-4.6z" class="c"/>',
      buttondown: '<path d="M18.5 9 16 18.5l4.6-4.6zM25.5 9 28 18.5l-4.6-4.6z" class="c"/><circle cx="16.9" cy="16.6" r=".9" class="b"/><circle cx="27.1" cy="16.6" r=".9" class="b"/>',
      mao: '<path d="M17 8.5q5 3 10 0v3.2q-5 3-10 0z" class="c"/>'
    }[o.cuello];
    return `<svg viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" fill="#F7F2EA"/>
      <path d="M17 9 9 13l-3.5 16 5 1.6L12 21v19h20V21l1.5 9.6 5-1.6L35 13l-8-4q-5 3.4-10 0z" fill="#fff" stroke="#6B1E2C" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M22 13v27" stroke="#6B1E2C" stroke-width=".8"/><g fill="#6B1E2C"><circle cx="22" cy="21" r=".8"/><circle cx="22" cy="27" r=".8"/><circle cx="22" cy="33" r=".8"/></g>
      <g fill="#fff" stroke="#6B1E2C" stroke-width="1.1" stroke-linejoin="round">${cuello}</g></svg>`.replace('class="b"', 'fill="#6B1E2C"').replace('class="b"', 'fill="#6B1E2C"').replace(/ class="c"/g, '');
  }
  function miniTela(o) {
    if (o.foto) return `<img src="${o.foto}" alt="" loading="lazy">`;
    const id = 'm-' + o.id;
    const pat = {
      popelina: `<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#FCFBF8"/><rect width="1" height="1" fill="#F1EEE7"/></pattern>`,
      'oxford-blanco': `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#F7F4EE"/><rect width="2" height="2" fill="#E9E3D8"/><rect x="2" y="2" width="2" height="2" fill="#E9E3D8"/></pattern>`,
      twill: `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#FBFAF6"/><rect width="1.2" height="4" fill="#ECE7DD"/></pattern>`,
      'oxford-celeste': `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#D7E6F7"/><rect width="2" height="2" fill="#F4F8FD"/><rect x="2" y="2" width="2" height="2" fill="#B9D0EC"/></pattern>`,
      rayas: `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><rect width="1.6" height="5" fill="#7FA5D6"/></pattern>`,
      'lana-gris': `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#9A9C9F"/><rect width="1" height="3" fill="#8C8E91"/></pattern>`,
      marino: `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#26324A"/><rect width="1.5" height="1.5" fill="#2E3B55"/><rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#1F2A40"/></pattern>`,
      espiga: `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#8E8A82"/><path d="M0 6 3 0 6 6" fill="none" stroke="#A7A298" stroke-width="1.1"/></pattern>`,
      carbon: `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#3B3D41"/><rect width="1" height="3" fill="#45474C"/></pattern>`
    }[o.muestra];
    return `<svg viewBox="0 0 44 44" aria-hidden="true"><defs>${pat}<linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#6B1E2C" stop-opacity=".1"/></linearGradient></defs><rect width="44" height="44" fill="url(#${id})"/><rect width="44" height="44" fill="url(#${id}-l)"/></svg>`;
  }
  // Menú desplegable con miniatura (botón + lista en el flujo, para que no lo recorte la ventana)
  function selectorMini(id, opciones, valor, mini, alCambiar) {
    const raiz = $(id), btn = raiz.querySelector('.sel'), lista = raiz.querySelector('ul');
    const fila = o => `<span class="miniatura">${mini(o)}</span><span class="txt"><b>${esc(o.nombre)}</b><small>${esc(o.detalle)}</small></span>`;
    const pinta = () => {
      btn.innerHTML = fila(porId(opciones, valor)) + '<span class="flecha" aria-hidden="true">▾</span>';
      lista.innerHTML = opciones.map(o => `<li role="option" tabindex="-1" data-id="${o.id}" aria-selected="${o.id === valor}">${fila(o)}</li>`).join('');
    };
    const abrir = v => {
      raiz.classList.toggle('abierto', v); btn.setAttribute('aria-expanded', String(v));
      if (v) (lista.querySelector('[aria-selected="true"]') || lista.firstElementChild).focus();
    };
    btn.addEventListener('click', () => abrir(!raiz.classList.contains('abierto')));
    lista.addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; valor = li.dataset.id; alCambiar(valor); pinta(); abrir(false); btn.focus(); });
    lista.addEventListener('keydown', e => {
      const items = [...lista.children], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') items[Math.min(i + 1, items.length - 1)].focus();
      else if (e.key === 'ArrowUp') items[Math.max(i - 1, 0)].focus();
      else if (e.key === 'Enter' || e.key === ' ') document.activeElement.click();
      else if (e.key === 'Escape') { abrir(false); btn.focus(); e.stopPropagation(); }
      else return;
      e.preventDefault();
    });
    document.addEventListener('click', e => { if (!raiz.contains(e.target)) abrir(false); });
    pinta();
    return { poner: v => { valor = v; pinta(); } };
  }

  const dlg = $('dEnviar');
  let usuario = null;
  const selPrenda = selectorMini('selPrenda', ENV.prendas, E.envio.prenda, miniPrenda, v => { E.envio.prenda = v; guardar(); pintarEnvio(); });
  const selTela = selectorMini('selTela', ENV.telas, E.envio.tela, miniTela, v => {
    E.envio.tela = v; const c = porId(ENV.telas, v).color;
    if (c && c !== E.camisa.color) { E.camisa.color = c; pintarPrenda(); }       // el maniquí viste la tela elegida
    guardar(); pintarEnvio();
  });

  const selTelaSastre = selectorMini('selTelaSastre', ENV.telasSastreria, E.envio.telaSastre, miniTela, v => { E.envio.telaSastre = v; E.sastre.tela = v; pintarSastre(); guardar(); pintarEnvio(); });
  const totalSastre = () => ENV.sastreria.reduce((s, p) => s + E.envio.sastre[p.id], 0);

  function datosEnvio() {
    const m = objetivo(), G = prendaActual(), rec = recomendar(E.sexo, m, E.camisa.corte);
    const pr = porId(ENV.prendas, E.envio.prenda), te = porId(ENV.telas, E.envio.tela), n = E.envio.cantidad;
    const ts = porId(ENV.telasSastreria, E.envio.telaSastre), sastre = ENV.sastreria.filter(p => E.envio.sastre[p.id] > 0);
    const meta = (usuario && usuario.user_metadata) || {};
    const nombre = E.envio.nombre.trim(), whats = E.envio.whatsapp.trim(), correo = (usuario && (usuario.email || meta.email)) || '';
    const silueta = `${E.sexo === 'h' ? 'Caballero' : 'Dama'} · ${tipoCuerpo(m)}`;
    const talla = `${nombreTalla(G)} · talla de referencia ${rec}${E.sexo === 'h' ? ' (cuello)' : ' (EU)'}`;
    const cuenta = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`;
    const cant = [n > 0 && cuenta(n, 'camisa', 'camisas'), ...sastre.map(p => cuenta(E.envio.sastre[p.id], p.nombre.toLowerCase(), p.plural))].filter(Boolean).join(' + ');
    const corte = E.camisa.corte === 'slim' ? 'Slim' : 'Regular';
    const hoy = new Date(), dd = x => String(x).padStart(2, '0');
    const fecha = `${dd(hoy.getDate())}/${dd(hoy.getMonth() + 1)}/${hoy.getFullYear()} ${dd(hoy.getHours())}:${dd(hoy.getMinutes())}`;
    const slug = (nombre || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'cliente';
    const archivo = `medidas-casasiego-${slug}-${hoy.getFullYear()}${dd(hoy.getMonth() + 1)}${dd(hoy.getDate())}.txt`;
    const cm = v => `${(Math.round(v * 2) / 2).toString()} cm`;
    const pulg = v => `${(v / 2.54).toFixed(1)} in`;
    const punto = (a, b, w = 26) => `${a} ${'.'.repeat(Math.max(2, w - a.length))} ${b}`;
    const lineasPedido = [n > 0 && punto('Camisa', `${n} · ${pr.nombre} · ${te.nombre}`), ...sastre.map(p => punto(p.nombre, `${E.envio.sastre[p.id]} · ${ts.nombre}`))].filter(Boolean);
    const contacto = [nombre && `Nombre: ${nombre}`, whats && `WhatsApp: ${whats}`, correo && `Correo: ${correo}`].filter(Boolean);
    const principales = ['cuello', 'hombros', 'pecho', 'cintura', 'cadera', 'brazo'].map(id => `${nombreDe(id).toLowerCase()} ${(Math.round(m[id] * 2) / 2)}`).join(', ');

    const linea = sastre.length ? (n > 0 ? 'Camisería y sastrería a medida' : 'Sastrería a medida') : 'Camisería a medida';
    const camisa = n > 0 ? [
      'MEDIDAS DE LA CAMISA (talla de referencia)',
      ...[['Cuello', G.cuello], [nombreDe('pecho'), G.pecho], ['Cintura', G.cintura], ['Bajo', G.bajo], ['Hombros', G.hombros], ['Manga (desde costura)', G.manga], ['Largo (desde cuello)', G.largo], ['Puño', G.puno]]
        .map(([a, v]) => punto(a, cm(v))), '',
      'AJUSTE DE LA CAMISA POR ZONA (holgura = prenda − cuerpo)',
      ...EV.map(z => punto(z.nombre, `${z.dif >= 0 ? '+' : '−'}${Math.abs(z.dif).toFixed(1)} cm · ${z.txt}`)), ''] : [];
    const txt = [
      'CASA SIEGO · SOLICITUD DE COTIZACIÓN', linea, '',
      punto('Fecha', fecha), punto('Cuenta', usuario ? `con sesión (${correo})` : 'sin cuenta · contacto por WhatsApp'),
      ...contacto.map(l => punto(l.split(': ')[0], l.split(': ').slice(1).join(': '))), '',
      'PEDIDO', ...lineasPedido, punto('Silueta', silueta), ...(n > 0 ? [punto('Talla', talla)] : []), punto('Corte', corte), '',
      'MEDIDAS DEL CUERPO', ...IDS.map(id => punto(nombreDe(id), `${cm(m[id])}   (${pulg(m[id])})`)), '',
      ...camisa,
      ...(n > 0 ? [E.sexo === 'm' ? 'Nota: camisa Dama a medida, entallada con pinzas de busto y cintura, cadera y bajo curvo.' : 'Nota: camisa de corte recto.'] : []),
      ...(sastre.length ? [`Sastrería: ${sastre.map(p => p.nombre.toLowerCase()).join(', ')} en ${ts.nombre.toLowerCase()}, con las medidas del cuerpo.`] : []),
      'Medidas tomadas en el Probador de casasiego.com/dresser/. Se confirman en la cita con un asesor.', ''
    ].join('\r\n');

    const asunto = sastre.length ? `Cotización · ${cant} a medida` : `Cotización · ${cant} a medida · ${pr.nombre} · ${te.nombre}`;
    const cuerpo = [
      'Hola, Casa Siego:', '',
      `Quiero cotizar ${cant} a medida.`, '',
      ...(n > 0 ? [`• Camisa: ${cuenta(n, 'camisa', 'camisas')} · ${pr.nombre} · ${te.nombre}`] : []),
      ...sastre.map(p => `• ${p.nombre}: ${E.envio.sastre[p.id]} · ${ts.nombre}`),
      `• Silueta: ${silueta}`, n > 0 ? `• ${talla}` : `• Corte ${corte}`,
      `• Medidas principales (cm): ${principales}`, '',
      `Adjunto el archivo ${archivo} con todas mis medidas y el ajuste por zona.`, '',
      ...contacto, '', 'Gracias.'
    ].join('\n');
    return { archivo, txt, asunto, cuerpo, silueta, talla: n > 0 ? talla : `Corte ${corte}`, cant };
  }

  function pintarEnvio() {
    usuario = sesionSitio();
    const meta = (usuario && usuario.user_metadata) || {};
    if (usuario && !E.envio.nombre) E.envio.nombre = String(meta.full_name || meta.name || meta.nombre || '').slice(0, 80);
    if (usuario && !E.envio.whatsapp) E.envio.whatsapp = String(meta.whatsapp || meta.phone || usuario.phone || '').slice(0, 20);
    const correo = usuario && (usuario.email || meta.email);
    $('envSesion').className = 'envio__sesion' + (usuario ? ' si' : '');
    $('envSesion').innerHTML = usuario
      ? `Sesión iniciada · <b>${esc(correo || 'tu cuenta')}</b>. Te respondemos a este correo; el WhatsApp es opcional.`
      : 'Sin sesión: escribe tu <b>nombre</b> y tu <b>WhatsApp</b> y te enviamos la cotización por ahí. ¿Tienes cuenta? <a href="../registro.html?modo=acceso&amp;volver=dresser/">Inicia sesión</a>.';
    $('envWhatsEtq').textContent = usuario ? 'WhatsApp (opcional)' : 'WhatsApp';
    if (document.activeElement !== $('envNombre')) $('envNombre').value = E.envio.nombre;
    if (document.activeElement !== $('envWhats')) $('envWhats').value = E.envio.whatsapp;
    $('envCant').textContent = E.envio.cantidad;
    $('envMenos').disabled = E.envio.cantidad <= (totalSastre() ? 0 : 1); $('envMas').disabled = E.envio.cantidad >= 20;
    $('envSastre').innerHTML = ENV.sastreria.map(p => `<div class="sastre__p"><span>${esc(p.nombre)}</span><div class="cantidad"><button type="button" data-menos="${p.id}" aria-label="Un ${esc(p.nombre.toLowerCase())} menos"${E.envio.sastre[p.id] <= (E.envio.cantidad || totalSastre() > E.envio.sastre[p.id] ? 0 : 1) ? ' disabled' : ''}>−</button><output aria-live="polite">${E.envio.sastre[p.id]}</output><button type="button" data-mas="${p.id}" aria-label="Un ${esc(p.nombre.toLowerCase())} más"${E.envio.sastre[p.id] >= 20 ? ' disabled' : ''}>+</button></div></div>`).join('');
    $('envTelaSastre').classList.toggle('apagado', !totalSastre());
    const d = datosEnvio();
    $('envResumen').innerHTML =
      `<span><b>${esc(d.cant)}</b> · ${esc(d.silueta)}</span><span>${esc(d.talla)}</span>` +
      `<span class="adj"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m21 11-8.6 8.6a5 5 0 0 1-7-7L14 4a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L15.5 7.3"/></svg>${esc(d.archivo)}</span>` +
      `<span class="para">Para: <b>${esc(ENV.correo)}</b> · Asunto: ${esc(d.asunto)}</span>`;
    $('envCuerpo').textContent = d.cuerpo;
  }
  function validar() {
    const nOk = E.envio.nombre.trim().length >= 2, wOk = whatsValido(E.envio.whatsapp) || (usuario && !E.envio.whatsapp.trim());
    $('envNombre').setAttribute('aria-invalid', String(!nOk)); $('envWhats').setAttribute('aria-invalid', String(!wOk));
    if (!nOk) { avisar('Escribe tu nombre.', 'mal'); $('envNombre').focus(); return false; }
    if (!wOk) { avisar('Escribe tu WhatsApp con lada (10 a 15 dígitos), por ejemplo +52 55 1234 5678.', 'mal'); $('envWhats').focus(); return false; }
    return true;
  }
  const avisar = (t, c) => { $('envAviso').textContent = t; $('envAviso').className = 'envio__aviso' + (c ? ' ' + c : ''); };
  const archivoTxt = d => new File(['﻿' + d.txt], d.archivo, { type: 'text/plain;charset=utf-8' });

  $('bEnviar').addEventListener('click', () => {
    pintarEnvio(); avisar('');
    const t = porId(ENV.telas, E.envio.tela);
    if (t.color !== E.camisa.color) { const o = ENV.telas.find(x => x.color === E.camisa.color); if (o) { E.envio.tela = o.id; selTela.poner(o.id); pintarEnvio(); } }
    try { $('envCompartir').hidden = !(navigator.canShare && navigator.canShare({ files: [archivoTxt(datosEnvio())] })); } catch { $('envCompartir').hidden = true; }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('envNombre').addEventListener('input', e => { E.envio.nombre = e.target.value.slice(0, 80); guardar(); pintarEnvio(); });
  $('envWhats').addEventListener('input', e => { E.envio.whatsapp = e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 20); guardar(); pintarEnvio(); });
  $('envMenos').addEventListener('click', () => { E.envio.cantidad = Math.max(totalSastre() ? 0 : 1, E.envio.cantidad - 1); guardar(); pintarEnvio(); });
  $('envSastre').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const k = b.dataset.mas || b.dataset.menos;
    E.envio.sastre[k] = clamp(E.envio.sastre[k] + (b.dataset.mas ? 1 : -1), 0, 20);
    if (b.dataset.mas && E.envio.sastre[k] === 1 && !E.sastre[k]) ponerSastre(k, true);   // el maniquí viste lo que se cotiza
    if (!E.envio.cantidad && !totalSastre()) E.envio.cantidad = 1;                 // siempre al menos una prenda
    guardar(); pintarEnvio();
  });
  $('envMas').addEventListener('click', () => { E.envio.cantidad = Math.min(20, E.envio.cantidad + 1); guardar(); pintarEnvio(); });
  $('envEnviar').addEventListener('click', () => {
    if (!validar()) return;
    const d = datosEnvio(), a = document.createElement('a');
    a.href = URL.createObjectURL(archivoTxt(d)); a.download = d.archivo;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    const mailto = `mailto:${ENV.correo}?subject=${encodeURIComponent(d.asunto)}&body=${encodeURIComponent(d.cuerpo)}`;
    setTimeout(() => { location.href = mailto; }, 350);
    avisar(`Listo: se descargó «${d.archivo}» y se abrió tu correo para ${ENV.correo}. Adjunta el archivo antes de enviar.`, 'bien');
  });
  $('envCompartir').addEventListener('click', async () => {
    if (!validar()) return;
    const d = datosEnvio();
    try {
      await navigator.share({ files: [archivoTxt(d)], title: d.asunto, text: `Para: ${ENV.correo}\nAsunto: ${d.asunto}\n\n${d.cuerpo}` });
      avisar(`Elige tu app de correo y envíalo a ${ENV.correo}.`, 'bien');
    } catch (e) { if (e && e.name !== 'AbortError') avisar('No se pudo compartir. Usa «Enviar por correo».', 'mal'); }
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
    if (e.target.closest('input, textarea, select, dialog') || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { const v = E.sexo === 'h' ? 'm' : 'h'; cambiarSexo(v); marcarSexo(v); }
    else if (k === 'c') ponerCamisa(!E.camisa.puesta);
    else if (k === 's') ponerSastre('saco', !E.sastre.saco);
    else if (k === 'k') ponerSastre('chaleco', !E.sastre.chaleco);
    else if (k === 'n') ponerSastre('pantalon', !E.sastre.pantalon);
    else if (k === 'm') ponerGuias(!E.guias);
    else if (k === 'v') { const v = E.maniqui === 'galan' ? 'cuerpo' : 'galan'; E.maniqui = v; marcarManiqui(v); guardar(); }
    else if (k === '0') encuadrar();
  });

  window.addEventListener('resize', () => { medir(); ['sexo', 'maniqui', 'unidades', 'corte'].forEach(id => moverPildora($(id))); });
  if (document.fonts) document.fonts.ready.then(() => ['sexo', 'maniqui', 'unidades', 'corte'].forEach(id => moverPildora($(id))));

  // ---------------------------------------------------------------- Arranque
  construirMedidas(); construirPresets(); construirColores(); construirSastre();
  $('bGuias').setAttribute('aria-pressed', String(E.guias));
  pintarMedidas(); pintarPrenda();
  medir();
  void marcarUnidades; void marcarCorte;
  requestAnimationFrame(cuadro);
})();
