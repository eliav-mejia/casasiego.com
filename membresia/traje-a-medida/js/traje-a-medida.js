/* Justo — traje-a-medida.js (v1.1.0)
   Constructor simplificado de membresia/traje-a-medida/. JavaScript puro, sin dependencias.
   Punto de partida: tres medidas de camisería (largo, cuello y puño). Después:
     01 Camisa    · color y tipo de fibra; el color tiñe las muestras de fibra y la tabla STOCK
                    decide qué fibras vienen en ese color (las demás quedan deshabilitadas)
     02 Saco      · tela: raya diplomática, negro liso o gris carbón
     03 Pantalón  · las mismas tres telas
     04 Piezas    · traje a 2 o 3 piezas; con 3 se habilita el chaleco, con las mismas telas
   El corte (solapa, botonadura, bolsillos…) queda fijo en el estilo «Clásico de negocios» y se afina con el sastre.
   El dibujo del figurín (secciones 2–5) es copia de brands/justo/a-medida/js/a-medida.js (v1.2.0), que sigue
   sirviendo intacto al constructor completo de brands/justo/a-medida/. */
(function () {
  'use strict';

  var ROOT = document.body.getAttribute('data-root') || '../../';
  var CONFIG = {
    contactEmail: 'info@casasiego.com',
    subject: 'Justo · Traje a medida',
    photos: ROOT + 'images/justo.esmx/'
  };

  /* 1. Opciones ------------------------------------------------------------- */
  // Corte fijo: valores por defecto del constructor completo (estilo «Clásico de negocios»)
  var BASE = {
    fibra: 's120', peso: 'medio', patron: 'liso', color: 'marino', acabado: 'mate',
    forroEstr: 'completo', forroMat: 'cupro', forroColor: 'juego',
    construccion: 'half', botonadura: 'sb2', hombro: 'hombrera', solapa: 'muesca', anchoSolapa: 'estandar',
    bolsilloPecho: 'recto', bolsillosInf: 'cartera', orientacion: 'rectos', aberturas: 'dos',
    botonesPuno: '4', disposicionPuno: 'separados', chaleco: 'sin', camisa: 'blanca', corbata: 'auto',
    tiro: 'medio', cintura: 'trabillas', tirantes: 'ninguno', cierre: 'cremallera', extension: 'boton',
    pinzas: 'flat', bolsDel: 'diagonal', bolsTras: '2b', quiebre: 'medio', terminacion: 'lisa',
    hombrosPost: 'regulares', espalda: 'neutra', brazos: 'neutros', abdomen: 'regular', gluteos: 'regular',
    hilo: 'juego', botones: 'cuernoOsc', fieltro: 'juego',
    monograma: false, monoTexto: '', monoUbic: 'interior', ticket: false, milanes: false, amf: false, operativos: false
  };

  // Telas de saco, pantalón y chaleco: las de los tres trajes de la casa.
  // [valor, etiqueta, nota, cambios sobre BASE, corbata que la acompaña, foto de referencia]
  var TELAS = [
    ['diplomatica', 'Raya diplomática', 'Azul marino con raya fina: el clásico de oficina.',
      { patron: 'diplomatica', color: 'marino' }, 'plata', 'SacoMarino_CorbataPlata_CamisaBlanca_diplomatica_pinstripe.jpg'],
    ['negro', 'Negro liso', 'Sobrio y formal; de la oficina a la noche.',
      { patron: 'liso', color: 'negro' }, 'roja', 'SacoNegro_ChalecoNegro__CorbataRoja_CamisaBlanca_clasico.jpg'],
    ['carbon', 'Gris carbón', 'Tweed de lana con textura, cálido y versátil.',
      { fibra: 's100', peso: 'pesado', patron: 'liso', color: 'carbon', acabado: 'texturizado' }, 'plata', 'SacoGris_CorbataPlata_CamisaAzul_tweed.jpg']
  ];
  // Fibras de la camisa: [valor, etiqueta, nota, tono de la camisa en la vista previa]
  // (el tono es el de la camisa blanca; los demás colores lo toman de COLORES_CAMISA)
  var FIBRAS = [
    ['algodon', 'Algodón', 'Suave y transpirable; el estándar de camisería.', { fill: '#F4F1EA', hi: '#FBF9F4', st: '#CFC8BB' }],
    ['algodon_lino', 'Algodón y lino', 'La frescura del lino con menos arrugas.', { fill: '#F0EBE0', hi: '#F7F3EB', st: '#CDC5B4' }],
    ['lino', 'Lino', 'Fresco, con textura y arrugas naturales.', { fill: '#ECE5D6', hi: '#F3EEE3', st: '#C9BFA9' }],
    ['seda', 'Seda', 'Brillo natural, para ocasiones.', { fill: '#F5F0E4', hi: '#FFFDF7', st: '#D6CCB6' }]
  ];
  // Colores de la camisa: [valor, etiqueta, nota, tono en algodón]
  var COLORES_CAMISA = [
    ['blanco', 'Blanco', 'El clásico: va con las tres telas de la casa.', { fill: '#F4F1EA', hi: '#FBF9F4', st: '#CFC8BB' }],
    ['cielo', 'Azul cielo', 'Luminoso y discreto, de diario.', { fill: '#BFD3EA', hi: '#D2E1F1', st: '#90A9C6' }],
    ['navy', 'Azul navy', 'Profundo, para un conjunto tono sobre tono.', { fill: '#28344F', hi: '#36435F', st: '#1A2236' }]
  ];
  // Existencias de camisería: fibra × color. true = disponible, false = no viene en ese color.
  // 'agotado' = la fibra entera sin existencias. Editar aquí; el selector y la tabla se actualizan solos.
  var STOCK = {
    algodon:      { blanco: true, cielo: true, navy: true },
    algodon_lino: { blanco: true, cielo: true, navy: true },
    lino:         { blanco: true, cielo: true, navy: true },
    seda:         'agotado'
  };
  // 'ok' | 'agotado' | 'no'
  function stock(fibra, color) {
    var row = STOCK[fibra];
    if (row === 'agotado') return 'agotado';
    return row && row[color] ? 'ok' : 'no';
  }
  function fibrasDisponibles(color) {
    return FIBRAS.filter(function (f) { return stock(f[0], color) === 'ok'; }).map(function (f) { return f[0]; });
  }
  // Tono de la camisa en la vista previa y en las muestras: el color, matizado por la fibra
  function shirtTone(color, fibra) {
    if (color === 'blanco') return find(FIBRAS, fibra)[3];
    var c = find(COLORES_CAMISA, color)[3];
    var k = { lino: 0.12, algodon_lino: 0.06 }[fibra];
    if (k) return { fill: mix(c.fill, '#C9BFA9', k), hi: mix(c.hi, '#D8CFBB', k), st: mix(c.st, '#8E8572', k) };
    if (fibra === 'seda') return { fill: c.fill, hi: mix(c.hi, '#FFFFFF', 0.15), st: c.st };
    return c;
  }

  var MEDIDAS = [['mLargo', 'Largo'], ['mCuello', 'Cuello'], ['mPuno', 'Puño']];

  // Selectores en cuadrícula: [id, etiqueta, opciones, sección]
  var PICKS = {
    colorCamisa: { label: 'Color', options: COLORES_CAMISA, tile: colorTile },
    fibraCamisa: { label: 'Tipo de fibra', options: FIBRAS, tile: fibraTile },
    tSaco: { label: 'Tela del saco', options: TELAS, tile: telaTile },
    tPantalon: { label: 'Tela del pantalón', options: TELAS, tile: telaTile },
    tChaleco: { label: 'Tela del chaleco', options: TELAS, tile: telaTile }
  };
  var LABELS = {
    mLargo: 'Largo', mCuello: 'Cuello', mPuno: 'Puño', colorCamisa: 'Color de la camisa', fibraCamisa: 'Fibra de la camisa',
    tSaco: 'Tela del saco', tPantalon: 'Tela del pantalón', tChaleco: 'Tela del chaleco', piezas: 'Piezas'
  };

  var SECTIONS = [
    { id: 'camisa', num: '01', stage: 'saco', title: 'Camisa', lead: 'El color y la fibra de tu camisa: cada color viene en ciertas fibras. Las medidas van arriba, en el punto de partida.', picks: ['colorCamisa', 'fibraCamisa'] },
    { id: 'saco', num: '02', stage: 'saco', title: 'Saco', lead: 'Elige una de las tres telas de la casa.', picks: ['tSaco'] },
    { id: 'pantalon', num: '03', stage: 'pantalon', title: 'Pantalón', lead: 'Las mismas tres telas: a juego con el saco o en contraste.', picks: ['tPantalon'] },
    { id: 'piezas', num: '04', stage: 'traje', title: 'Piezas', lead: 'Saco y pantalón, o el tres piezas con chaleco.', picks: [] }
  ];

  /* Etapas de la vista previa: encuadre (viewBox) por etapa y vista */
  var FULL = [40, 30, 320, 736], INSIDE = [50, 36, 300, 440];
  var STAGES = {
    traje: { label: 'Traje completo', box: { front: FULL, back: FULL, inside: INSIDE }, focus: 'tSaco' },
    saco: { label: 'Saco · primer plano', box: { front: [44, 36, 312, 392], back: [44, 36, 312, 392], inside: INSIDE }, focus: 'tSaco' },
    pantalon: { label: 'Pantalón · primer plano', box: { front: [96, 304, 208, 462], back: [96, 304, 208, 462], inside: [110, 404, 180, 64] }, focus: 'tPantalon' }
  };
  // Recuadro de detalle por campo: [vista, sin saco, recorte del viewBox, con chaleco]
  var VEST = [118, 40, 164, 330];
  var FOCUS = {
    mLargo: ['front', 1, [88, 40, 224, 330]], mCuello: ['front', 1, [164, 38, 72, 56]], mPuno: ['front', 1, [56, 322, 56, 50]],
    colorCamisa: ['front', 1, [160, 70, 80, 80]], fibraCamisa: ['front', 1, [160, 70, 80, 80]],
    tSaco: ['front', 0, [254, 180, 42, 42]], tPantalon: ['front', 1, [128, 470, 70, 70]],
    piezas: ['front', 1, VEST, 1], tChaleco: ['front', 1, VEST, 1]
  };

  /* 2. Paletas (de aquí al final de jacketInside: copia de a-medida.js v1.2.0)  -------------------------------------------------------------- */
  var CLOTH = {
    marino: '#1F2A44', medianoche: '#151B2C', cobalto: '#2E4C86', carbon: '#33363A', gris: '#6B6E73',
    perla: '#A9AAAA', negro: '#121314', tabaco: '#5C3F2B', oliva: '#4F5434', arena: '#C7B28D', burdeos: '#5A1F2A'
  };
  var LINING = {
    burdeos: '#6D1F2C', oro: '#B8913F', botella: '#1F4A35', real: '#2A4FA0', lavanda: '#9A8FC2',
    paisley: '#5E1B27', personal: '#1E2B45'
  };
  var THREAD = { burdeos: '#7D1F2E', rojo: '#C0392B', celeste: '#8FC1E3', oro: '#C9A14A', crema: '#EFE6D2' };
  var FELT = { gris: '#8A8D91', burdeos: '#6A1E2B', camel: '#B88A55', verde: '#2F4A35' };
  var SHIRT = { blanca: { fill: '#F4F1EA', hi: '#FBF9F4', st: '#CFC8BB' }, celeste: { fill: '#BFD3EA', hi: '#D2E1F1', st: '#90A9C6' } };
  var TIE = { plata: '#B5B9BF', roja: '#C2443F', burdeos: '#6E2433', marino: '#1D2B4A' };
  var BUTTON = {
    cuernoOsc: { fill: '#3A2A1F', hi: '#6A4E3A' }, cuernoCl: { fill: '#8C6A4A', hi: '#C49E76' },
    hueso: { fill: '#E4D9C2', hi: '#FFF8EA' }, madreperla: { fill: '#E9E6DE', hi: '#FFFFFF' },
    oro: { fill: '#B98F3A', hi: '#F3D98A', metal: true }, plata: { fill: '#A7ABB0', hi: '#F2F4F6', metal: true }
  };

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function hex(a) {
    return '#' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join('');
  }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex(A.map(function (v, i) { return v + (B[i] - v) * t; })); }
  function lum(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

  function palette(s) {
    var base = CLOTH[s.color];
    var L = lum(base);
    var c = { base: base };
    c.stroke = L < 0.14 ? mix(base, '#FFFFFF', 0.2) : mix(base, '#000000', L > 0.5 ? 0.38 : 0.5);
    c.motif = L > 0.5 ? mix(base, '#000000', 0.32) : mix(base, '#FFFFFF', 0.6);
    c.lining = s.forroColor === 'juego' ? mix(base, L > 0.5 ? '#000000' : '#FFFFFF', 0.16) : LINING[s.forroColor];
    c.thread = s.hilo === 'juego' ? mix(base, L > 0.5 ? '#000000' : '#FFFFFF', 0.22) : THREAD[s.hilo];
    c.felt = s.fieltro === 'juego' ? mix(base, '#000000', 0.12) : FELT[s.fieltro];
    c.button = s.botones === 'corozo'
      ? { fill: mix(base, '#000000', 0.2), hi: mix(base, '#FFFFFF', 0.25) }
      : BUTTON[s.botones];
    c.tie = TIE[s.corbata] || (s.color === 'burdeos' ? '#1D2B4A' : (s.color === 'oliva' || s.color === 'arena') ? '#3B4A6B' : '#6E2433');
    c.shirt = SHIRT[s.camisa] || SHIRT.blanca;
    c.shoe = ['tabaco', 'oliva', 'arena'].indexOf(s.color) > -1 ? '#3A2318' : '#141414';
    return c;
  }

  /* 4. Geometría del figurín (unidades del viewBox; ~3,8 px por cm) --------- */
  function geo(s) {
    var sh = { hombrera: 80, ingles: 78, camicia: 86 }[s.hombro] + (s.construccion === 'des' ? 3 : 0);
    var p = s.hombrosPost;
    var dL = p === 'caidos' ? 6 : p === 'erguidos' ? -4 : 0;
    var dR = p === 'asimetricos' ? 7 : dL;
    var B = {
      sb1: { yb: 268, b: [[200, 268]] },
      sb2: { yb: 250, b: [[200, 250], [200, 296]] },
      sb3: { yb: 218, b: [[200, 218], [200, 260], [200, 302]] },
      sb3r2: { yb: 250, b: [[200, 258], [200, 302]], hole: 214 },
      db42: { yb: 262, b: [[178, 262], [222, 262], [178, 306], [222, 306]] },
      db62: { yb: 262, b: [[160, 218], [240, 218], [178, 262], [222, 262], [178, 306], [222, 306]] },
      db61: { yb: 306, b: [[160, 218], [240, 218], [178, 262], [222, 262], [178, 306], [222, 306]] }
    }[s.botonadura];
    var low = Math.max.apply(null, B.b.map(function (b) { return b[1]; }));
    return {
      SyL: sh + dL, SyR: sh + dR,
      wx: { plano: 118, regular: 115, prominente: 109 }[s.abdomen],
      db: s.botonadura.charAt(0) === 'd',
      yb: B.yb, btns: B.b, hole: B.hole, apex: low + 24,
      wpx: { estrecha: 25, estandar: 31, ancha: 39 }[s.anchoSolapa],
      yW: { alto: 330, medio: 344, bajo: 358 }[s.tiro],
      hem: { sin: 730, medio: 737, completo: 743 }[s.quiebre],
      cuff: { lisa: 0, v35: 13, v40: 15, v45: 17 }[s.terminacion]
    };
  }

  /* 5. Dibujo SVG ------------------------------------------------------------ */
  function mirror(inner) { return '<g transform="translate(400 0) scale(-1 1)">' + inner + '</g>'; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (ch) { return '&#' + ch.charCodeAt(0) + ';'; }); }
  function cloth(d, c, w) {
    return '<path d="' + d + '" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width="' + (w || 1) + '" stroke-linejoin="round"/>';
  }
  function shaded(d, c, w) { return cloth(d, c, w) + '<path d="' + d + '" fill="url(#shadeX)"/>'; }
  function line(d, color, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (w || 1) + '" stroke-linecap="round"' + (extra || '') + '/>';
  }

  function defs(s, c) {
    var m = c.motif, weave = '';
    switch (s.patron) {
      case 'diplomatica':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="9" height="9"><rect width="0.7" height="9" fill="' + m + '" opacity=".6"/></pattern>'; break;
      case 'tiza':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="15" height="15"><rect width="1.8" height="15" fill="' + m + '" opacity=".28"/></pattern>'; break;
      case 'gales':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="28" height="28">' +
          '<path d="M0 1.5H28M0 3.5H28M0 5.5H28M1.5 0V28M3.5 0V28M5.5 0V28" stroke="' + m + '" stroke-width=".55" opacity=".38"/>' +
          '<path d="M0 14H28M0 17H28M14 0V28M17 0V28" stroke="' + m + '" stroke-width=".45" opacity=".22"/>' +
          '<path d="M0 23.5H28M23.5 0V28" stroke="#7FA3C8" stroke-width=".7" opacity=".45"/></pattern>'; break;
      case 'perdiz':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="3.6" height="3.6"><circle cx="1.8" cy="1.8" r=".55" fill="' + m + '" opacity=".38"/></pattern>'; break;
      case 'espiga':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="6" height="4"><path d="M0 4L3 0M3 0L6 4" stroke="' + m + '" stroke-width=".6" opacity=".3" fill="none"/></pattern>'; break;
      case 'ventana':
        weave = '<pattern id="weave" patternUnits="userSpaceOnUse" width="38" height="38"><path d="M0 .5H38M.5 0V38" stroke="' + m + '" stroke-width=".8" opacity=".45"/></pattern>'; break;
    }
    var satin = s.acabado === 'satinado' || s.fibra === 'seda';
    var noisy = s.acabado === 'texturizado' || s.fibra === 'lino' || s.peso === 'pesado';

    var motif = '';
    if (s.forroColor === 'paisley') {
      motif = '<pattern id="liningMotif" patternUnits="userSpaceOnUse" width="26" height="26">' +
        '<path d="M9 19c-6-4-5-12 2-13 6 0 6 7 1 8-2 .4-3-1-2-2" fill="none" stroke="#C9A14A" stroke-width=".9" opacity=".7"/>' +
        '<circle cx="21" cy="7" r="1.3" fill="#C9A14A" opacity=".6"/><path d="M22 22c-3-1-3-5 0-5" fill="none" stroke="#C9A14A" stroke-width=".7" opacity=".5"/></pattern>';
    } else if (s.forroColor === 'personal') {
      motif = '<pattern id="liningMotif" patternUnits="userSpaceOnUse" width="16" height="16">' +
        '<path d="M8 0L16 8L8 16L0 8Z" fill="none" stroke="#B8913F" stroke-width=".7" opacity=".6"/><circle cx="8" cy="8" r="1.2" fill="#B8913F" opacity=".6"/></pattern>';
    }

    return '<defs>' + weave + motif +
      '<linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="360" y2="160">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".38" stop-color="#fff" stop-opacity=".14"/>' +
      '<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".68" stop-color="#fff" stop-opacity=".09"/>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<filter id="noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="7"/>' +
      '<feColorMatrix values=".33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 .16"/></filter>' +
      '<pattern id="cloth" patternUnits="userSpaceOnUse" width="400" height="800"><rect width="400" height="800" fill="' + c.base + '"/>' +
      (weave ? '<rect width="400" height="800" fill="url(#weave)"/>' : '') +
      (noisy ? '<rect width="400" height="800" filter="url(#noise)"/>' : '') +
      (satin ? '<rect width="400" height="800" fill="url(#sheen)"/>' : '') + '</pattern>' +
      '<pattern id="lining" patternUnits="userSpaceOnUse" width="400" height="800"><rect width="400" height="800" fill="' + c.lining + '"/>' +
      (motif ? '<rect width="400" height="800" fill="url(#liningMotif)"/>' : '') +
      '<rect width="400" height="800" fill="url(#sheen)"/></pattern>' +
      '<linearGradient id="shadeX" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-opacity=".24"/><stop offset=".22" stop-opacity="0"/>' +
      '<stop offset=".78" stop-opacity="0"/><stop offset="1" stop-opacity=".24"/></linearGradient>' +
      '<radialGradient id="btn" cx=".35" cy=".32" r=".8"><stop offset="0" stop-color="' + c.button.hi + '"/><stop offset=".55" stop-color="' + c.button.fill + '"/>' +
      '<stop offset="1" stop-color="' + mix(c.button.fill, '#000000', 0.35) + '"/></radialGradient>' +
      '</defs>';
  }

  function button(x, y, r, c) {
    var o = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#btn)" stroke="' + mix(c.button.fill, '#000000', 0.45) + '" stroke-width=".5"/>';
    if (c.button.metal) return o + '<circle cx="' + x + '" cy="' + y + '" r="' + r1(r * 0.55) + '" fill="none" stroke="' + c.button.hi + '" stroke-width=".4" opacity=".7"/>';
    if (r < 3) return o;
    var d = r * 0.3, hc = mix(c.button.fill, '#000000', 0.55);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      o += '<circle cx="' + r1(x + q[0] * d) + '" cy="' + r1(y + q[1] * d) + '" r=".45" fill="' + hc + '"/>';
    });
    return o;
  }

  function shoes(c) {
    var d = 'M126 733L196 733L197 751Q197 759 189 759L114 759Q102 759 106 750Q110 741 126 739Z';
    var shoe = '<path d="' + d + '" fill="' + c.shoe + '"/><path d="M118 753Q150 749 194 752" stroke="#fff" stroke-opacity=".12" fill="none"/>';
    return shoe + mirror(shoe);
  }

  // Manga izquierda (vista frontal); la derecha es su reflejo.
  function sleeve(s, g, Sy, c, fill, withButtons) {
    var top = s.hombro === 'ingles'
      ? 'M101 ' + (Sy - 1) + 'C90 ' + (Sy - 8) + ' 75 ' + (Sy + 1) + ' 72 ' + (Sy + 26)
      : s.hombro === 'camicia'
        ? 'M98 ' + Sy + 'C84 ' + (Sy + 2) + ' 76 ' + (Sy + 16) + ' 73 ' + (Sy + 34)
        : 'M97 ' + Sy + 'C82 ' + (Sy - 1) + ' 74 ' + (Sy + 11) + ' 72 ' + (Sy + 30);
    var d = top + 'L61 366Q77 372 94 369L104 196Z';
    var o = fill === 'lining'
      ? '<path d="' + d + '" fill="url(#lining)" stroke="' + mix(c.lining, '#000000', 0.4) + '" stroke-width="1"/>'
      : shaded(d, c, 1.1);
    if (s.hombro === 'camicia' && fill !== 'lining') {
      o += line('M89 ' + (Sy + 3) + 'l-2 5M85 ' + (Sy + 5) + 'l-3 5M81 ' + (Sy + 9) + 'l-3 4', c.stroke, 0.6, ' opacity=".7"');
    }
    o += line('M62 358Q77 363 93.5 361', c.stroke, 0.6, ' opacity=".5"');
    if (withButtons) {
      var n = +s.botonesPuno, sp = s.disposicionPuno === 'kissing' ? 4.3 : 6.6;
      var y0 = Sy + 30, edge = function (y) { return 72 + (61 - 72) * (y - y0) / (366 - y0); };
      for (var i = n - 1; i >= 0; i--) {
        var y = 355 - i * sp, x = r1(edge(y) + 5.2);
        o += line('M' + (x + 1.5) + ' ' + y + 'h4.2', s.operativos ? c.thread : c.stroke, s.operativos ? 1.1 : 0.7, s.operativos ? '' : ' opacity=".6"');
        o += button(x, y, 2.5, c);
      }
    }
    return o;
  }

  function bodyPath(g, front) {
    var H = 400, wx = g.wx, wr = 400 - wx;
    var hem = (!front || g.db)
      ? 'L296 ' + H
      : 'L166 ' + H + 'C186 ' + (H - 2) + ' 198 ' + (g.apex + 30) + ' 200 ' + g.apex + 'C202 ' + (g.apex + 30) + ' 214 ' + (H - 2) + ' 234 ' + H + 'L296 ' + H;
    return 'M184 56L96 ' + g.SyL + 'C99 120 99 150 101 178C106 215 ' + wx + ' 235 ' + wx + ' 262C' + wx + ' 300 104 350 104 ' + H + hem +
      'C296 350 ' + wr + ' 300 ' + wr + ' 262C' + wr + ' 235 294 215 299 178C301 150 301 120 304 ' + g.SyR + 'L216 56Q200 50 184 56Z';
  }

  function shirtV(s, g, c) {
    var yb = g.yb;
    var o = '<path d="M186 48L214 48L212 60L200 ' + yb + 'L188 60Z" fill="' + c.shirt.fill + '" stroke="' + c.shirt.st + '" stroke-width=".6"/>';
    if (s.solapa === 'chal') {
      o += '<path d="M200 66L186 59L186 73ZM200 66L214 59L214 73Z" fill="#111"/><rect x="196.8" y="62.5" width="6.4" height="7" rx="1.6" fill="#1C1C1C"/>';
    } else {
      o += '<path d="M196.5 61H203.5L202.5 70H197.5Z" fill="' + mix(c.tie, '#000000', 0.15) + '"/>' +
        '<path d="M197.5 70H202.5L206 ' + (yb - 9) + 'L200 ' + (yb - 1) + 'L194 ' + (yb - 9) + 'Z" fill="' + c.tie + '"/>';
    }
    if (s._vest && !g.db) {
      // Chaleco asomando en la V del saco, en su propia tela (defs con sufijo -v; las solapas tapan sus bordes)
      var rx = function (y) { return r1(188 + 12 * (y - 62) / (yb - 62)); }, top = Math.min(112, yb - 70);
      o += sfx(cloth('M' + (rx(top) - 4) + ' ' + top + 'L200 ' + (yb - 30) + 'L' + r1(404 - rx(top)) + ' ' + top + 'L206 ' + (yb + 2) + 'L194 ' + (yb + 2) + 'Z', s._vest, 0.8), 'v');
    }
    o += '<path d="M200 60L184 47L182 58L190.5 76ZM200 60L216 47L218 58L209.5 76Z" fill="' + c.shirt.hi + '" stroke="' + c.shirt.st + '" stroke-width=".7" stroke-linejoin="round"/>';
    return o;
  }

  // Chaleco completo (vista sin saco): delantero en tela, espalda en forro
  function vestTorso(s, g, c, back) {
    var y = g.yW + 6;
    var arm = 'L250 ' + (g.SyR + 12) + 'Q262 ' + (g.SyR + 60) + ' 268 200';
    var armL = 'L132 200Q138 ' + (g.SyL + 60) + ' 150 ' + (g.SyL + 12);
    if (back) {
      var d = 'M186 54Q200 58 214 54' + arm + 'L270 ' + (y + 8) + 'L130 ' + (y + 8) + armL + 'Z';
      return '<path d="' + d + '" fill="url(#lining)" stroke="' + mix(c.lining, '#000000', 0.4) + '" stroke-width="1"/>' +
        line('M140 ' + (y - 40) + 'H260', mix(c.lining, '#000000', 0.4), 1.4);
    }
    var f = 'M186 54L200 160L214 54' + arm + 'L270 ' + (y + 2) + 'L206 ' + (y + 20) + 'L200 ' + (y + 12) + 'L194 ' + (y + 20) + 'L130 ' + (y + 2) + armL + 'Z';
    var o = shaded(f, c, 1.1) + line('M200 160L200 ' + (y + 12), c.stroke, 0.9);
    o += line('M148 ' + (y - 50) + 'h20M232 ' + (y - 50) + 'h20', c.stroke, 1.1);
    for (var i = 0, n = 5, step = (y - 6 - 176) / (n - 1); i < n; i++) o += button(200, r1(176 + i * step), 2.6, c);
    return o;
  }

  // Solapa izquierda (lado del espectador); la derecha es su reflejo.
  function lapel(s, g, c, isRight) {
    var yb = g.yb, w = g.wpx + (g.db ? 4 : 0);
    var rx = function (y) { return r1(188 + 12 * (y - 62) / (yb - 62)); };
    var Tx = r1(rx(110) - w - 4), o = '', lap, edge, hole;
    if (s.solapa === 'chal') {
      var cy = r1(60 + (yb - 60) * 0.42);
      edge = 'M174 57Q' + (Tx - 8) + ' ' + cy + ' 200 ' + yb;
      lap = 'M188 60L174 57Q' + (Tx - 8) + ' ' + cy + ' 200 ' + yb + 'Z';
      hole = [Tx + 8, 124];
    } else {
      o += cloth('M188 60L173 57L162 96L178 100L' + rx(100) + ' 100Z', c);
      if (s.solapa === 'punta') {
        var px = Tx - 6, py = 84, pc = r1(py + (yb - py) * 0.5);
        edge = 'M' + px + ' ' + py + 'Q' + (px + 2) + ' ' + pc + ' 200 ' + yb;
        lap = 'M' + rx(102) + ' 102L179 103L' + px + ' ' + py + 'Q' + (px + 2) + ' ' + pc + ' 200 ' + yb + 'Z';
        hole = [px + 13, 112];
      } else {
        var ty = 104, tc = r1(ty + (yb - ty) * 0.5);
        edge = 'M' + Tx + ' ' + ty + 'Q' + Tx + ' ' + tc + ' 200 ' + yb;
        lap = 'M' + rx(100) + ' 100L176 101L170 108L' + Tx + ' ' + ty + 'Q' + Tx + ' ' + tc + ' 200 ' + yb + 'Z';
        hole = [Tx + 9, 121];
      }
    }
    o += cloth(lap, c, 1.1) + '<path d="' + lap + '" fill="#000" opacity=".07"/>';
    o += line('M' + rx(70) + ' 70L200 ' + yb, '#000', 1.4, ' opacity=".12"');
    if (s.amf) o += line(edge, c.thread, 0.8, ' stroke-dasharray="1.3 1.9" transform="translate(3 0)"');
    if (isRight) {
      o += s.milanes
        ? line('M' + hole[0] + ' ' + hole[1] + 'l9 -3', c.thread, 2.2)
        : line('M' + hole[0] + ' ' + hole[1] + 'l8 -2.6', mix(c.base, '#000000', 0.5), 1.1);
    }
    return o;
  }

  function pocketShape(style, cx, y, w, h, c) {
    var x = cx - w / 2;
    if (style === 'cartera') {
      return '<path d="M' + x + ' ' + y + 'h' + w + 'v' + (h - 3) + 'q0 3 -3 3h' + (-(w - 6)) + 'q-3 0 -3 -3Z" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width="1"/>' +
        '<path d="M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z" fill="#000" opacity=".06"/>' +
        line('M' + x + ' ' + y + 'h' + w, c.stroke, 1.6);
    }
    if (style === 'ribete') {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="4.4" rx="1" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width=".9"/>' +
        line('M' + (x + 1) + ' ' + (y + 2.2) + 'h' + (w - 2), c.stroke, 0.6);
    }
    var ph = h * 2.9;
    return '<path d="M' + (x - 3) + ' ' + (y - 4) + 'h' + (w + 6) + 'v' + (ph - 8) + 'q0 8 -8 8h' + (-(w - 10)) + 'q-8 0 -8 -8Z" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width="1"/>' +
      line('M' + (x - 3) + ' ' + (y + 2) + 'h' + (w + 6), c.stroke, 0.7, ' opacity=".7"') +
      line('M' + (x - 0.5) + ' ' + (y + 4) + 'v' + (ph - 12) + 'q0 6 6 6h' + (w - 11) + 'q6 0 6 -6v' + (-(ph - 12)), c.stroke, 0.5, ' stroke-dasharray="1.2 1.6" opacity=".6"');
  }
  function pocket(s, cx, y, w, h, c) {
    var rot = s.orientacion === 'inclinados' && s.bolsillosInf !== 'parche' ? -9 : 0;
    return '<g transform="rotate(' + rot + ' ' + cx + ' ' + y + ')">' + pocketShape(s.bolsillosInf, cx, y, w, h, c) + '</g>';
  }

  function jacketFront(s, g, c) {
    var o = sleeve(s, g, g.SyL, c, null, true) + mirror(sleeve(s, g, g.SyR, c, null, true));
    var body = bodyPath(g, true);
    o += shaded(body, c, 1.1);
    o += line('M150 196Q148 250 152 300M250 196Q252 250 248 300', c.stroke, 0.6, ' opacity=".5"');
    o += shirtV(s, g, c);

    // Bolsillos inferiores (antes de las solapas no importa: quedan por debajo)
    var pcx = g.db ? 142 : 145, pw = 44;
    o += pocket(s, pcx, 318, pw, 15, c) + mirror(pocket(s, pcx, 318, pw, 15, c));
    if (s.ticket) o += pocket(s, pcx + 2, 294, 30, 11, c);

    // Bolsillo de pecho (lado izquierdo del cliente = derecha del espectador)
    if (s.bolsilloPecho === 'recto') {
      o += '<g transform="rotate(-7 265 162)"><rect x="251" y="160" width="28" height="5" rx="1" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width=".9"/></g>';
    } else if (s.bolsilloPecho === 'barchetta') {
      o += '<path d="M250 164Q265 171 280 156L280 161Q265 176 250 169Z" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width=".9"/>';
    }

    // Delanteros: borde del cruzado o línea central del saco sencillo
    if (g.db) {
      o += line('M200 ' + g.yb + 'C186 ' + (g.yb + 4) + ' 170 ' + (g.yb + 8) + ' 168 ' + (g.yb + 30) + 'L168 399', c.stroke, 1.1);
      if (s.amf) o += line('M171 ' + (g.yb + 30) + 'L171 397', c.thread, 0.8, ' stroke-dasharray="1.3 1.9"');
    } else {
      o += line('M200 ' + g.yb + 'L200 ' + g.apex, c.stroke, 1);
    }

    o += lapel(s, g, c, false) + mirror(lapel(s, g, c, true));
    if (g.hole) o += line('M203 ' + g.hole + 'h8', s.hilo === 'juego' ? mix(c.base, '#000000', 0.5) : c.thread, 1.5);
    g.btns.forEach(function (b) { o += button(b[0], b[1], 4.2, c); });
    return o;
  }

  function shirtTorso(s, g, c, back) {
    var y = g.yW + 6;
    var d = 'M184 50L104 ' + (g.SyL + 4) + 'C106 150 112 220 128 ' + y + 'L272 ' + y + 'C288 220 294 150 296 ' + (g.SyR + 4) + 'L216 50Q200 46 184 50Z';
    var sl = 'M104 ' + (g.SyL + 4) + 'C90 ' + (g.SyL + 6) + ' 80 ' + (g.SyL + 20) + ' 78 ' + (g.SyL + 40) + 'L70 360L96 362L108 200Z';
    var st = c.shirt.st, sf = c.shirt.fill;
    var o = '<path d="' + sl + '" fill="' + sf + '" stroke="' + st + '"/>' + mirror('<path d="' + sl + '" fill="' + sf + '" stroke="' + st + '"/>');
    o += '<path d="' + d + '" fill="' + c.shirt.hi + '" stroke="' + st + '"/><path d="' + d + '" fill="url(#shadeX)" opacity=".4"/>';
    if (back) return o + line('M140 ' + (g.SyL + 14) + 'Q200 ' + (g.SyL + 22) + ' 260 ' + (g.SyR + 14), st, 0.8);
    o += line('M200 60V' + y, st, 0.8);
    for (var by = 100; by < y - 10; by += 40) o += '<circle cx="200" cy="' + by + '" r="1.6" fill="#E8E2D6" stroke="' + st + '" stroke-width=".4"/>';
    if (s.solapa === 'chal') {
      o += '<path d="M200 64L186 57L186 71ZM200 64L214 57L214 71Z" fill="#111"/>';
    } else {
      o += '<path d="M196.5 59H203.5L202.5 68H197.5Z" fill="' + mix(c.tie, '#000000', 0.15) + '"/><path d="M197.5 68H202.5L208 ' + (y - 40) + 'L200 ' + (y - 30) + 'L192 ' + (y - 40) + 'Z" fill="' + c.tie + '"/>';
    }
    return o + '<path d="M200 58L184 45L182 56L190.5 74ZM200 58L216 45L218 56L209.5 74Z" fill="' + c.shirt.hi + '" stroke="' + st + '" stroke-width=".7"/>';
  }

  function trouserLeg(g) {
    var yW = g.yW, cr = yW + 112, h = g.hem;
    return 'M130 ' + yW + 'C124 ' + (yW + 40) + ' 121 ' + (yW + 85) + ' 123 ' + (yW + 135) + 'L129 ' + h + 'L194 ' + h + 'L197 ' + (cr + 22) + 'Q199 ' + (cr + 4) + ' 200 ' + (cr - 6) + 'L200 ' + yW + 'Z';
  }

  function trousers(s, g, c, back) {
    var yW = g.yW, h = g.hem, st = c.stroke;
    var leg = shaded(trouserLeg(g), c, 1.1);
    var legX = line('M162 ' + (yW + 60) + 'L161.5 ' + (h - 2), st, 0.8, ' opacity=".35"');
    if (s.quiebre === 'completo') legX += line('M136 ' + (h - 16) + 'Q160 ' + (h - 25) + ' 188 ' + (h - 14), st, 0.7, ' opacity=".55"');
    if (s.quiebre === 'medio') legX += line('M146 ' + (h - 11) + 'Q162 ' + (h - 16) + ' 180 ' + (h - 10), st, 0.6, ' opacity=".45"');
    if (g.cuff) legX += '<rect x="128.6" y="' + (h - g.cuff) + '" width="65.6" height="' + g.cuff + '" fill="url(#cloth)" stroke="' + st + '" stroke-width="1"/>';

    var side = '';
    if (!back) {
      side += s.bolsDel === 'diagonal'
        ? line('M136 ' + (yW + 11) + 'L150 ' + (yW + 64), st, 1.2)
        : line('M130.5 ' + (yW + 13) + 'L128 ' + (yW + 70), st, 1.2);
      var np = s.pinzas === 'flat' ? 0 : +s.pinzas.charAt(0), inward = s.pinzas.indexOf('in') > -1;
      [164, 153].slice(0, np).forEach(function (x) {
        side += line('M' + x + ' ' + (yW + 11) + 'Q' + (x + 1) + ' ' + (yW + 40) + ' ' + x + ' ' + (yW + 66), st, 1);
        side += line('M' + (x + (inward ? 2 : -2)) + ' ' + (yW + 12) + 'L' + (x + (inward ? 1.5 : -1.5)) + ' ' + (yW + 34), '#000', 1.6, ' opacity=".14"');
      });
    } else {
      var pts = { '2b': [160, 240], '2': [160, 240], '1b': [240], '1': [240], '0': [] }[s.bolsTras];
      var bb = s.bolsTras.indexOf('b') > -1;
      pts.forEach(function (x) {
        side += '<rect x="' + (x - 17) + '" y="' + (yW + 36) + '" width="34" height="4" rx="1" fill="url(#cloth)" stroke="' + st + '" stroke-width=".9"/>';
        if (bb) side += button(x, yW + 46, 2.6, c);
      });
      side += line('M200 ' + (yW + 11) + 'L200 ' + (yW + 106), st, 0.9);
    }
    // Ajustadores laterales (por pierna; el reflejo los pone en ambos lados)
    var adj = '';
    if (s.cintura !== 'trabillas') {
      adj += '<path d="M129 ' + (yW + 2) + 'h18v7h-18Z" fill="url(#cloth)" stroke="' + st + '" stroke-width=".8"/>';
      adj += s.cintura === 'hebilla'
        ? '<rect x="137" y="' + (yW + 0.5) + '" width="6" height="10" rx="1" fill="none" stroke="#B9B2A3" stroke-width="1.1"/>'
        : button(143, yW + 5.5, 2.4, c);
    }
    var o = leg + legX + side + adj;
    // Atrás los bolsillos van en posiciones absolutas, así que no se reflejan
    o += mirror(leg + legX + (back ? '' : side) + adj);

    // Pretina, cierre, trabillas y tirantes
    o += '<rect x="128.5" y="' + (yW - 1) + '" width="143" height="12" fill="url(#cloth)" stroke="' + st + '" stroke-width="1"/>';
    var loops = [];
    if (s.cintura === 'trabillas') loops = back ? [152, 200, 248] : [140, 170, 230, 260];
    loops.forEach(function (x) {
      o += '<rect x="' + (x - 2.4) + '" y="' + (yW - 3) + '" width="4.8" height="16" rx=".8" fill="url(#cloth)" stroke="' + st + '" stroke-width=".8"/>';
    });
    if (!back) {
      o += line('M207 ' + (yW + 11) + 'L207 ' + (yW + 58) + 'Q207 ' + (yW + 66) + ' 200 ' + (yW + 68), st, 0.8, ' stroke-dasharray="1.6 1.4"');
      if (s.extension !== 'sin') {
        o += '<path d="M198 ' + (yW - 1) + 'h15q3 0 3 3v6q0 3 -3 3h-15Z" fill="url(#cloth)" stroke="' + st + '" stroke-width=".9"/>';
        o += s.extension === 'boton'
          ? button(211, yW + 5, 2.3, c)
          : '<rect x="208.5" y="' + (yW + 3.2) + '" width="5" height="3.6" rx=".8" fill="#B9B2A3"/>';
      } else {
        o += button(204, yW + 5, 2.3, c);
      }
    }
    if (s.tirantes === 'exteriores') {
      (back ? [194, 206] : [150, 172, 228, 250]).forEach(function (x) { o += button(x, yW + 5, 2.3, c); });
    }
    return o;
  }

  function jacketBack(s, g, c) {
    var o = sleeve(s, g, g.SyL, c, null, true) + mirror(sleeve(s, g, g.SyR, c, null, true));
    o += shaded(bodyPath(g, false), c, 1.1);
    var seamEnd = s.aberturas === 'una' ? 328 : 400;
    o += line('M200 62L200 ' + seamEnd, c.stroke, 0.9);
    o += line('M113 188C121 240 120 300 122 400', c.stroke, 0.8, ' opacity=".8"') + mirror(line('M113 188C121 240 120 300 122 400', c.stroke, 0.8, ' opacity=".8"'));
    if (s.aberturas === 'una') {
      o += line('M200 328L200 400', c.stroke, 1.2) + line('M200 328L205 334L205 399', c.stroke, 0.7, ' opacity=".6"');
    } else if (s.aberturas === 'dos') {
      var v = line('M122 326L122.3 400', c.stroke, 1.3) + line('M122 326L126 331L126.3 399', c.stroke, 0.7, ' opacity=".6"');
      o += v + mirror(v);
    }
    o += cloth('M182 57Q200 49 218 57L216 71Q200 63 184 71Z', c, 1);
    return o;
  }

  function jacketInside(s, g, c) {
    var lst = mix(c.lining, '#000000', 0.4);
    var o = sleeve(s, g, g.SyL, c, 'lining', false) + mirror(sleeve(s, g, g.SyR, c, 'lining', false));
    var body = bodyPath(g, false);
    if (s.forroEstr === 'completo') {
      o += '<path d="' + body + '" fill="url(#lining)" stroke="' + lst + '" stroke-width="1.1"/><path d="' + body + '" fill="url(#shadeX)" opacity=".6"/>';
      o += line('M200 72L200 398', lst, 0.8, ' opacity=".8"') + line('M203 74L203 396', '#000', 1.2, ' opacity=".08"');
    } else {
      o += shaded(body, c, 1.1);
      // Costuras ribeteadas (Hong Kong) en el color del forro
      var tape = line('M113 188C121 240 120 300 122 400', c.lining, 2.6);
      o += line('M200 62L200 400', c.lining, 2.6) + tape + mirror(tape);
      if (s.forroEstr === 'medio') {
        var half = 'M184 56L96 ' + g.SyL + 'C99 120 99 150 101 178C104 205 108 225 112 240Q156 262 200 248Q244 262 288 240C292 225 296 205 299 178C301 150 301 120 304 ' + g.SyR + 'L216 56Q200 50 184 56Z';
        o += '<path d="' + half + '" fill="url(#lining)" stroke="' + lst + '" stroke-width="1"/>';
      } else {
        o += '<path d="M184 56L140 70Q200 92 260 70L216 56Q200 50 184 56Z" fill="url(#lining)" stroke="' + lst + '" stroke-width=".8"/>';
      }
    }
    // Fieltro bajo el cuello, colgador y etiqueta
    o += '<path d="M178 56Q200 46 222 56L219 75Q200 66 181 75Z" fill="' + c.felt + '" stroke="' + mix(c.felt, '#000000', 0.35) + '" stroke-width="1"/>';
    o += line('M193 64Q200 70 207 64', '#8B8378', 1);
    o += '<rect x="182" y="82" width="36" height="13" fill="#F3EFE6" stroke="#CFC8BB" stroke-width=".5"/>' +
      '<text x="200" y="91" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="6" letter-spacing="1.4" fill="#3B1A1F">JUSTO</text>';

    // Pretina del pantalón (interior), para el monograma
    var py = 432;
    o += '<rect x="128" y="' + py + '" width="144" height="16" fill="url(#cloth)" stroke="' + c.stroke + '" stroke-width="1"/>' +
      '<rect x="131" y="' + (py + 4) + '" width="138" height="8" fill="url(#lining)"/>' +
      '<text x="200" y="' + (py + 30) + '" text-anchor="middle" font-family="Spectral, Georgia, serif" font-style="italic" font-size="8" fill="#6D665C">pretina, interior</text>';

    if (s.monograma && s.monoTexto) {
      var t = esc(s.monoTexto.trim()), mc = s.hilo === 'juego' ? '#D9C38F' : c.thread;
      var at = { interior: [200, 170, 12], cuello: [200, 71, 5.5], pretina: [200, py + 10.5, 6.5] }[s.monoUbic];
      o += '<text x="' + at[0] + '" y="' + at[1] + '" text-anchor="middle" font-family="EB Garamond, Georgia, serif" font-style="italic" font-size="' + at[2] + '" fill="' + mc + '" letter-spacing=".5">' + t + '</text>';
    }
    return o;
  }

  // Prefija ids y referencias url(#…) para que varias telas (saco, pantalón, chaleco) convivan en un mismo SVG
  function sfx(str, k) {
    return str.replace(/id="([^"]+)"/g, 'id="$1-' + k + '"').replace(/url\(#([^)]+)\)/g, 'url(#$1-' + k + ')');
  }
  function find(list, v) { return list.filter(function (o) { return o[0] === v; })[0] || list[0]; }
  // Estado completo de una prenda: corte fijo + tela elegida
  function garment(s, tela) {
    var t = find(TELAS, tela);
    return Object.assign({}, BASE, t[3], { corbata: find(TELAS, s.tSaco)[4], chaleco: s.piezas === '3' ? 'juego' : 'sin' });
  }

  // vest: el chaleco se dibuja sin saco salvo en la etapa Pantalón, donde taparía pretina y pinzas
  function scene(s, view, hide, vest) {
    var sj = garment(s, s.tSaco), sp = garment(s, s.tPantalon), sv = garment(s, s.tChaleco);
    var g = geo(sj), cj = palette(sj), cp = palette(sp), cv = palette(sv), back = view === 'back';
    var shirt = shirtTone(s.colorCamisa, s.fibraCamisa);
    cj.shirt = cp.shirt = cv.shirt = shirt;
    var three = s.piezas === '3';
    sj._vest = three ? cv : null;
    var out = defs(sj, cj) + (three ? sfx(defs(sv, cv), 'v') : '');
    if (view === 'inside') return out + jacketInside(sj, g, cj);
    var pants = sfx(defs(sp, cp) + trousers(sp, g, cp, back), 'p');
    out += shoes(cj);
    if (hide) out += shirtTorso(sj, g, cj, back) + pants + (vest && three ? sfx(vestTorso(sv, g, cv, back), 'v') : '');
    else out += pants + (back ? jacketBack(sj, g, cj) : jacketFront(sj, g, cj));
    return out;
  }

  // En la etapa Pantalón el saco se quita para ver pretina, pinzas y bolsillos
  function hidden() { return ui.stage === 'pantalon' || ui.hideJacket; }

  function draw() {
    var svg = $('#am-suit');
    svg.innerHTML = scene(state, ui.view, hidden(), ui.stage !== 'pantalon');
    zoomTo(STAGES[ui.stage].box[ui.view]);
    $('#am-caption').textContent = STAGES[ui.stage].label + ' · ' + {
      front: 'frente' + (hidden() ? ', sin saco' : ''),
      back: 'espalda' + (hidden() ? ', sin saco' : ''),
      inside: 'interior: forro y fieltro'
    }[ui.view];
    drawDetail();
  }

  /* Encuadre animado entre etapas (viewBox) */
  var zoomAnim = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setBox(b) { ui.vb = b; $('#am-suit').setAttribute('viewBox', b.map(r1).join(' ')); }
  function zoomTo(target) {
    if (ui.vbTarget && ui.vbTarget.join() === target.join()) return;
    ui.vbTarget = target;
    cancelAnimationFrame(zoomAnim);
    if (!ui.vb || reduced) { setBox(target); return; }
    var from = ui.vb.slice(), t0 = null, dur = 620;
    (function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setBox(from.map(function (v, i) { return v + (target[i] - v) * e; }));
      if (k < 1) zoomAnim = requestAnimationFrame(step);
    })(performance.now());
  }

  /* Recuadro de detalle: primer plano del campo activo */
  function drawDetail() {
    var id = ui.focus || STAGES[ui.stage].focus;
    if (id === 'tChaleco' && state.piezas !== '3') id = 'piezas';
    var f = FOCUS[id];
    var el = $('#am-detail-svg');
    el.setAttribute('viewBox', f[2].join(' '));
    el.innerHTML = sfx(scene(state, f[0], !!f[1], !!f[3]), 'd');
    $('#am-detail-cap').textContent = LABELS[id] || 'Detalle';
  }

  /* 6. Muestras textiles (imágenes SVG de los selectores, sin texto) --------- */
  function svgURL(inner) {
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" preserveAspectRatio="xMidYMid slice">' + inner + '</svg>') + '")';
  }
  var NOISE = '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4"/>' +
    '<feColorMatrix values=".33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 .32"/></filter>';
  function telaTile(v) {
    var t = find(TELAS, v), base = CLOTH[t[3].color], o = '<rect width="48" height="48" fill="' + base + '"/>';
    if (v === 'diplomatica') {
      var m = mix(base, '#FFFFFF', 0.6);
      for (var x = 4; x < 48; x += 8) o += '<rect x="' + x + '" width=".7" height="48" fill="' + m + '" opacity=".75"/>';
    } else if (v === 'negro') {
      o += '<g stroke="#2B2D30" stroke-width=".6" opacity=".7">';
      for (var d = -48; d < 48; d += 3) o += '<path d="M' + d + ' 48L' + (d + 48) + ' 0"/>';
      o += '</g>';
    } else {
      o += '<defs>' + NOISE + '</defs><rect width="48" height="48" filter="url(#n)"/>' +
        '<g stroke="' + mix(base, '#FFFFFF', 0.18) + '" stroke-width=".5" opacity=".6">';
      for (var y = 2; y < 48; y += 4) o += '<path d="M0 ' + y + 'L48 ' + (y + 2) + '"/>';
      o += '</g>';
    }
    return svgURL(o);
  }
  // Muestra de color: algodón liso con su trama fina
  function colorTile(v) {
    var c = find(COLORES_CAMISA, v)[3], o = '<rect width="48" height="48" fill="' + c.fill + '"/><g stroke="' + c.st + '" stroke-width=".45" opacity=".5">';
    for (var i = 1; i < 48; i += 2) o += '<path d="M0 ' + i + 'H48M' + i + ' 0V48"/>';
    return svgURL(o + '</g>');
  }
  // Muestra de fibra, teñida con el color de camisa elegido
  function fibraTile(v) {
    var c = shirtTone(state.colorCamisa, v), o = '<rect width="48" height="48" fill="' + c.fill + '"/>', i;
    var hatch = function (step, op) {
      var h = '<g stroke="' + c.st + '" stroke-width=".45" opacity="' + op + '">';
      for (i = 1; i < 48; i += step) h += '<path d="M0 ' + i + 'H48M' + i + ' 0V48"/>';
      return h + '</g>';
    };
    if (v === 'algodon') o += hatch(2, '.55');
    if (v === 'lino' || v === 'algodon_lino') {
      o += '<defs>' + NOISE + '</defs><rect width="48" height="48" filter="url(#n)" opacity="' + (v === 'lino' ? '.8' : '.45') + '"/>';
      o += hatch(v === 'lino' ? 3 : 2, v === 'lino' ? '.35' : '.45');
      if (v === 'lino') o += '<g stroke="' + c.st + '" stroke-linecap="round"><path d="M3 9H17M24 21H44M6 33H20M28 41H40" stroke-width="1.3" opacity=".7"/></g>';
    }
    if (v === 'seda') {
      o += '<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset=".42" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="' + c.st + '" stop-opacity=".35"/>' +
        '<stop offset=".8" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="' + c.st + '" stop-opacity=".25"/></linearGradient></defs>' +
        '<rect width="48" height="48" fill="url(#s)"/>';
    }
    return svgURL(o);
  }

  /* 7. Formulario ----------------------------------------------------------- */
  function $(q) { return document.querySelector(q); }
  function $$(q) { return Array.prototype.slice.call(document.querySelectorAll(q)); }

  // Desplegable en cuadrícula: cerrado muestra muestra + nombre; abierto, solo las muestras (nombre para lectores de pantalla)
  function pickHTML(id) {
    var p = PICKS[id], cols = p.options.length === 4 ? 2 : 3;
    return '<div class="am-field" data-field="' + id + '">' +
      '<span class="am-field__label" id="lbl-' + id + '">' + p.label + '</span>' +
      '<div class="am-pick" data-pick="' + id + '">' +
        '<button type="button" class="am-pick__btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="lbl-' + id + ' val-' + id + '">' +
          '<span class="am-pick__tile" aria-hidden="true"></span><span class="am-pick__val" id="val-' + id + '"></span></button>' +
        '<div class="am-pick__grid" role="listbox" aria-labelledby="lbl-' + id + '" style="--cols:' + cols + '" hidden>' +
          p.options.map(function (o) {
            return '<button type="button" class="am-pick__opt" role="option" tabindex="-1" data-value="' + o[0] + '" aria-label="' + o[1] + '" style="background-image:' + p.tile(o[0]).replace(/"/g, '&quot;') + '"><span class="am-pick__tag" aria-hidden="true"></span></button>';
          }).join('') +
        '</div></div>' +
      '<span class="am-field__hint" data-hint="' + id + '"></span></div>';
  }

  function buildForm() {
    $('#am-form').innerHTML = SECTIONS.map(function (sec) {
      var body = sec.picks.map(pickHTML).join('');
      if (sec.id === 'camisa') body += stockHTML();
      if (sec.id === 'piezas') {
        body = '<fieldset class="am-addons am-piezas"><legend>Traje</legend>' +
          [['2', 'Traje a 2 piezas', 'Saco y pantalón.'], ['3', 'Traje a 3 piezas', 'Saco, pantalón y chaleco.']].map(function (o) {
            return '<label class="am-check" data-field="piezas"><input type="radio" name="piezas" value="' + o[0] + '">' +
              '<span class="am-check__text"><strong>' + o[1] + '</strong><small>' + o[2] + '</small></span></label>';
          }).join('') + '</fieldset>' + pickHTML('tChaleco');
      }
      return '<details class="am-sec" id="sec-' + sec.id + '" data-stage="' + sec.stage + '" open>' +
        '<summary><span class="am-sec__num">' + sec.num + '</span><span class="am-sec__title">' + sec.title + '</span><span class="am-sec__chev" aria-hidden="true"></span></summary>' +
        '<div class="am-sec__body"><p class="am-sec__lead">' + sec.lead + '</p><div class="am-fields">' + body + '</div></div></details>';
    }).join('');
  }

  // Tabla de disponibilidad de camisería (fibra × color), generada desde STOCK
  function stockHTML() {
    return '<div class="am-stock-wrap"><table class="am-stock">' +
      '<caption>Disponibilidad de camisería</caption>' +
      '<thead><tr><th scope="col">Fibra</th>' + COLORES_CAMISA.map(function (c) {
        return '<th scope="col" data-col="' + c[0] + '"><span class="am-stock__dot" style="background:' + c[3].fill + '" aria-hidden="true"></span>' + c[1] + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      FIBRAS.map(function (f) {
        var cells = STOCK[f[0]] === 'agotado'
          ? '<td colspan="' + COLORES_CAMISA.length + '" class="am-stock__out">Agotado</td>'
          : COLORES_CAMISA.map(function (c) {
            return stock(f[0], c[0]) === 'ok'
              ? '<td data-col="' + c[0] + '"><span aria-hidden="true">✓</span><span class="sr-only">Disponible</span></td>'
              : '<td data-col="' + c[0] + '" class="is-no"><span aria-hidden="true">—</span><span class="sr-only">No disponible</span></td>';
          }).join('');
        return '<tr data-row="' + f[0] + '"><th scope="row">' + f[1] + '</th>' + cells + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  // Marca en las muestras de fibra lo que no viene en el color elegido o está agotado
  function refreshFibras() {
    var color = state.colorCamisa, cName = find(COLORES_CAMISA, color)[1];
    $$('[data-pick="fibraCamisa"] .am-pick__opt').forEach(function (b) {
      var v = b.getAttribute('data-value'), f = find(FIBRAS, v), st = stock(v, color);
      b.style.backgroundImage = fibraTile(v);
      b.disabled = st !== 'ok';
      b.setAttribute('aria-disabled', String(st !== 'ok'));
      b.setAttribute('aria-label', f[1] + (st === 'agotado' ? ', agotado' : st === 'no' ? ', no disponible en ' + cName.toLowerCase() : ''));
      b.querySelector('.am-pick__tag').textContent = st === 'agotado' ? 'Agotado' : st === 'no' ? 'No en ' + cName.toLowerCase() : '';
    });
    $$('.am-stock [data-col]').forEach(function (td) { td.classList.toggle('is-col', td.getAttribute('data-col') === color); });
    $$('.am-stock tbody tr').forEach(function (tr) { tr.classList.toggle('is-row', tr.getAttribute('data-row') === state.fibraCamisa); });
  }

  // Si la fibra elegida no viene en el color, pasa a la primera disponible. Devuelve el aviso, si hubo cambio.
  function fitFibra() {
    var ok = fibrasDisponibles(state.colorCamisa);
    if (!ok.length || ok.indexOf(state.fibraCamisa) > -1) return '';
    var antes = find(FIBRAS, state.fibraCamisa)[1];
    state.fibraCamisa = ok[0];
    return antes + ' no viene en ' + find(COLORES_CAMISA, state.colorCamisa)[1].toLowerCase() + ': cambiamos a ' + find(FIBRAS, ok[0])[1].toLowerCase();
  }

  function syncForm() {
    MEDIDAS.forEach(function (m) { $('[name="' + m[0] + '"]').value = state[m[0]]; });
    $$('[name="piezas"]').forEach(function (r) { r.checked = r.value === state.piezas; });
  }

  function refreshFieldUI() {
    Object.keys(PICKS).forEach(function (id) {
      var p = PICKS[id], o = find(p.options, state[id]), box = $('[data-pick="' + id + '"]');
      box.querySelector('.am-pick__tile').style.backgroundImage = p.tile(o[0]);
      box.querySelector('.am-pick__val').textContent = o[1];
      $$('[data-pick="' + id + '"] .am-pick__opt').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-value') === o[0])); });
      $('[data-hint="' + id + '"]').textContent = o[2];
    });
    refreshFibras();
    // Chaleco: solo con traje a 3 piezas
    var off = state.piezas !== '3', vest = $('[data-field="tChaleco"]');
    vest.classList.toggle('is-off', off);
    vest.querySelector('.am-pick__btn').disabled = off;
    if (off) $('[data-hint="tChaleco"]').textContent = 'Marca «Traje a 3 piezas» para habilitar el chaleco.';

    var toggle = $('.am-toggle');
    toggle.classList.toggle('is-disabled', ui.view === 'inside' || ui.stage === 'pantalon');
    $('#am-hide-jacket').checked = hidden();
    $$('.am-stages button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-stage') === ui.stage)); });
    var t = find(TELAS, state.tSaco), photo = $('#am-photo');
    photo.hidden = false;
    photo.querySelector('img').src = CONFIG.photos + t[5];
    photo.querySelector('img').alt = 'Foto de referencia: saco ' + t[1];
  }

  /* Abrir, cerrar y elegir en los selectores en cuadrícula */
  var openPick = null;
  function closePick(focusBtn) {
    if (!openPick) return;
    var box = $('[data-pick="' + openPick + '"]');
    box.querySelector('.am-pick__grid').hidden = true;
    box.querySelector('.am-pick__btn').setAttribute('aria-expanded', 'false');
    if (focusBtn) box.querySelector('.am-pick__btn').focus();
    openPick = null;
  }
  function togglePick(id) {
    if (openPick === id) { closePick(true); return; }
    closePick(false);
    var box = $('[data-pick="' + id + '"]');
    box.querySelector('.am-pick__grid').hidden = false;
    box.querySelector('.am-pick__btn').setAttribute('aria-expanded', 'true');
    openPick = id;
    (box.querySelector('.am-pick__opt[aria-selected="true"]:not(:disabled)') || box.querySelector('.am-pick__opt:not(:disabled)')).focus();
    focusField(id);
  }
  function choose(id, value) {
    if (id === 'fibraCamisa' && stock(value, state.colorCamisa) !== 'ok') return;
    state[id] = value;
    var aviso = id === 'colorCamisa' ? fitFibra() : '';
    closePick(true);
    focusField(id);
    if (aviso) toast(aviso);
  }

  /* 8. Ficha técnica -------------------------------------------------------- */
  function summaryData() {
    var cm = function (v) { return String(v).replace('.', ',') + ' cm'; };
    var med = MEDIDAS.filter(function (m) { return state[m[0]] !== ''; }).map(function (m) { return [m[1], cm(state[m[0]])]; });
    var three = state.piezas === '3';
    return [
      { num: '01', title: 'Camisa', rows: (med.length ? med : [['Medidas', 'Se toman en la sesión']]).concat([['Color', find(COLORES_CAMISA, state.colorCamisa)[1]], ['Fibra', find(FIBRAS, state.fibraCamisa)[1]]]) },
      { num: '02', title: 'Saco', rows: [['Tela', find(TELAS, state.tSaco)[1]]] },
      { num: '03', title: 'Pantalón', rows: [['Tela', find(TELAS, state.tPantalon)[1]]] },
      { num: '04', title: 'Piezas', rows: [['Traje', three ? '3 piezas (saco, pantalón y chaleco)' : '2 piezas (saco y pantalón)']]
        .concat(three ? [['Chaleco', find(TELAS, state.tChaleco)[1]]] : []) }
    ];
  }

  function renderSummary() {
    $('#am-summary').innerHTML = summaryData().map(function (sec) {
      return '<div><h3><span>' + sec.num + '</span>' + sec.title + '</h3><dl>' + sec.rows.map(function (r) {
        return '<div class="am-row"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl></div>';
    }).join('');
  }

  function summaryText() {
    var out = ['JUSTO by Casa Siego® · Traje a medida', 'Ficha generada el ' + new Date().toLocaleDateString('es-MX'), ''];
    summaryData().forEach(function (sec) {
      out.push(sec.num + ' · ' + sec.title.toUpperCase());
      sec.rows.forEach(function (r) { out.push('  ' + r[0] + ': ' + r[1]); });
      out.push('');
    });
    out.push('Configuración: ' + shareURL());
    return out.join('\n');
  }

  /* 9. Estado y enlace para compartir (estado en el hash) ------------------- */
  function defaults() {
    return { mLargo: '', mCuello: '', mPuno: '', colorCamisa: 'blanco', fibraCamisa: 'algodon', tSaco: 'diplomatica', tPantalon: 'diplomatica', piezas: '2', tChaleco: 'diplomatica' };
  }
  var state = defaults();
  var ui = { view: 'front', hideJacket: false, stage: 'traje', focus: null, vb: null, vbTarget: null };

  function valid(k, v) {
    if (k === 'piezas') return v === '2' || v === '3';
    if (PICKS[k]) return PICKS[k].options.some(function (o) { return o[0] === v; });
    if (/^m[A-Z]/.test(k) && k in state) return v === '' || (+v >= 0 && +v <= 250);
    return false;
  }
  function encodeState() {
    var d = defaults(), diff = {};
    Object.keys(state).forEach(function (k) { if (state[k] !== d[k]) diff[k] = state[k]; });
    return btoa(unescape(encodeURIComponent(JSON.stringify(diff)))).replace(/=+$/, '');
  }
  function shareURL() { return location.href.split('#')[0] + '#c=' + encodeState(); }
  // Enlaces antiguos de los trajes de la casa (#t=…)
  var OLD_SUITS = {
    'marino-diplomatica': { tSaco: 'diplomatica', tPantalon: 'diplomatica' },
    'negro-chaleco': { tSaco: 'negro', tPantalon: 'negro', tChaleco: 'negro', piezas: '3' },
    'gris-tweed': { tSaco: 'carbon', tPantalon: 'carbon' }
  };
  function loadHash() {
    var t = location.hash.match(/#t=([a-z-]+)/);
    if (t && OLD_SUITS[t[1]]) { Object.assign(state, OLD_SUITS[t[1]]); return; }
    var m = location.hash.match(/#c=([A-Za-z0-9+/]+)/);
    if (!m) return;
    try {
      var diff = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      Object.keys(diff).forEach(function (k) { if (valid(k, diff[k])) state[k] = String(diff[k]); });
    } catch (e) { /* enlace dañado: se ignora */ }
    fitFibra(); // enlaces viejos con una fibra agotada o que ya no viene en ese color
  }

  /* 10. Acciones ------------------------------------------------------------ */
  var toastTimer;
  function toast(msg) {
    var t = $('#am-toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }
  function copy(text, ok) {
    var done = function () { toast(ok); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
    document.body.removeChild(ta);
  }

  function update() {
    refreshFieldUI();
    draw();
    renderSummary();
    var body = summaryText();
    if (body.length > 1800) body = body.slice(0, 1800) + '\n…';
    $('#am-send').href = 'mailto:' + CONFIG.contactEmail + '?subject=' + encodeURIComponent(CONFIG.subject) + '&body=' + encodeURIComponent(body);
  }

  function onInput(e) {
    var el = e.target;
    if (!el.name || !(el.name in state)) return;
    if (el.type === 'radio' && !el.checked) return;
    state[el.name] = el.value;
    focusField(el.name);
  }

  /* 11. Etapas, foco y modal ------------------------------------------------ */
  var FIELD_STAGE = { colorCamisa: 'saco', fibraCamisa: 'saco', tSaco: 'saco', tPantalon: 'pantalon', piezas: 'traje', tChaleco: 'traje' };
  function setStage(stage) {
    if (ui.stage === stage) return;
    ui.stage = stage;
    if (stage === 'pantalon' && ui.view === 'inside') ui.view = 'front';
    syncViewTabs();
  }
  function syncViewTabs() {
    $$('.am-views button').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-view') === ui.view)); });
  }
  function focusField(id) {
    if (FIELD_STAGE[id]) setStage(FIELD_STAGE[id]);
    ui.focus = FOCUS[id] ? id : null;
    update();
  }

  var modalReturn = null;
  function openModal(html, wide) {
    var m = $('#am-modal');
    modalReturn = document.activeElement;
    $('#am-modal-body').innerHTML = html;
    m.classList.toggle('am-modal--wide', !!wide);
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('is-on'); });
    $('#am-modal .am-modal__close').focus();
  }
  function closeModal() {
    var m = $('#am-modal');
    if (m.hidden) return;
    m.classList.remove('is-on');
    setTimeout(function () { m.hidden = true; }, 200);
    if (modalReturn && modalReturn.focus) modalReturn.focus();
  }
  function photoNotice() {
    var t = find(TELAS, state.tSaco);
    openModal('<figure class="am-modal__photo"><img src="' + CONFIG.photos + t[5] + '" alt="Foto de referencia: saco ' + esc(t[1]) + '" width="922" height="1152">' +
      '<figcaption><span id="am-modal-title">' + esc(t[1]) + '</span> · foto de referencia</figcaption></figure>', true);
  }

  function init() {
    buildForm();
    loadHash();
    syncForm();

    var form = $('#am-form'), medidas = $('#am-medidas');
    [form, medidas].forEach(function (el) {
      el.addEventListener('input', onInput);
      el.addEventListener('change', onInput);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    medidas.addEventListener('focusin', function (e) { if (e.target.name && e.target.name !== ui.focus) focusField(e.target.name); });

    // Selectores en cuadrícula
    form.addEventListener('click', function (e) {
      var opt = e.target.closest('.am-pick__opt'), btn = e.target.closest('.am-pick__btn');
      if (opt) choose(opt.closest('[data-pick]').getAttribute('data-pick'), opt.getAttribute('data-value'));
      else if (btn) togglePick(btn.closest('[data-pick]').getAttribute('data-pick'));
    });
    form.addEventListener('keydown', function (e) {
      var opt = e.target.closest && e.target.closest('.am-pick__opt');
      if (!opt) return;
      var all = $$('[data-pick="' + openPick + '"] .am-pick__opt'), i = all.indexOf(opt), n = all.length;
      var on = all.filter(function (b) { return !b.disabled; });
      var cols = n === 4 ? 2 : 3;
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (step) {
        // salta las muestras deshabilitadas (agotadas o sin ese color)
        e.preventDefault();
        var j = i;
        do { j = (j + step + n) % n; } while (all[j].disabled && j !== i);
        all[j].focus();
      }
      else if (e.key === 'Home') { e.preventDefault(); on[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); on[on.length - 1].focus(); }
      else if (e.key === 'Tab') closePick(false);
    });
    document.addEventListener('click', function (e) {
      if (openPick && !e.target.closest('[data-pick="' + openPick + '"]')) closePick(false);
    });

    $$('.am-stages button').forEach(function (b) {
      b.addEventListener('click', function () { setStage(b.getAttribute('data-stage')); ui.focus = null; update(); });
    });
    $$('.am-sec > summary').forEach(function (sum) {
      sum.addEventListener('click', function () {
        if (sum.parentNode.open) return;
        setStage(sum.parentNode.getAttribute('data-stage'));
        ui.focus = null;
        update();
      });
    });
    function setView(v) {
      ui.view = v;
      if (v === 'inside' && ui.stage === 'pantalon') ui.stage = 'saco';
      syncViewTabs();
    }
    $$('.am-views button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); update(); });
    });
    var vista = { frente: 'front', espalda: 'back', interior: 'inside' }[new URLSearchParams(location.search).get('vista')];
    if (vista) setView(vista);
    $('#am-hide-jacket').addEventListener('change', function (e) {
      if (ui.stage === 'pantalon') { e.target.checked = true; return; }
      ui.hideJacket = e.target.checked; update();
    });

    $('#am-photo').addEventListener('click', photoNotice);
    $('#am-modal').addEventListener('click', function (e) {
      if (e.target === e.currentTarget || e.target.closest('.am-modal__close')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (openPick) closePick(true); else closeModal();
    });

    $('#am-copy').addEventListener('click', function () { copy(summaryText(), 'Ficha copiada'); });
    $('#am-share').addEventListener('click', function () {
      var url = shareURL();
      history.replaceState(null, '', url);
      copy(url, 'Enlace copiado');
    });
    $('#am-download').addEventListener('click', function () {
      var blob = new Blob([summaryText()], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'justo-traje-a-medida.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('#am-reset').addEventListener('click', function () {
      history.replaceState(null, '', location.href.split('#')[0]);
      ui.focus = null;
      state = defaults();
      syncForm();
      update();
      toast('Configuración reiniciada');
    });

    // Al iniciar: del saco al traje completo
    ui.vbTarget = null;
    setBox(STAGES.saco.box[ui.view].slice());
    setTimeout(update, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
