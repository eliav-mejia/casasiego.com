/* Justo — a-medida.js (v1.1.0)
   Constructor de traje a medida. JavaScript puro, sin dependencias.
   El formulario se genera desde SCHEMA; cada cambio vuelve a dibujar el SVG
   (frente, espalda o interior) y la ficha técnica.
   Una vista previa por etapa: Traje (completo, al iniciar), Saco y Pantalón (primer plano). Cada sección del
   formulario lleva a su etapa y cada campo tiene su recuadro de detalle (FOCUS) en la esquina de la vista.
   Invitados (sin sesión de miembro en Supabase, ver js/acceso-config.js): solo los tres trajes de la casa (SUITS)
   de «Clásico de negocios» y «Napolitano relajado»; el resto de campos queda bloqueado con un candado que abre
   el aviso «Toma de medidas / Membresía Casa Siego». */
(function () {
  'use strict';

  var CONFIG = {
    // Destino del botón «Enviar a la sastrería» (mailto con la ficha completa).
    contactEmail: 'info@casasiego.com',
    subject: 'Justo · Traje a medida',
    measureSubject: 'Justo · Toma de medidas',
    membershipSubject: 'Membresía Club Casa Siego',
    signIn: '../../../',                       // portada con el acceso de miembros
    photos: '../../../images/brands/justo.esmx/'
  };

  /* 1. Opciones ------------------------------------------------------------- */
  // [valor, etiqueta, nota opcional que aparece bajo el campo]
  function sel(id, label, options, def, extra) {
    var f = { id: id, type: 'select', label: label, options: options, def: def || options[0][0] };
    for (var k in extra) f[k] = extra[k];
    return f;
  }
  function num(id, label) { return { id: id, type: 'number', label: label, def: '', half: true }; }
  function group(label) { return { type: 'group', label: label }; }

  var SCHEMA = [
    {
      id: 'tejido', num: '01', stage: 'traje', title: 'Tejido y composición', lead: 'La materia prima: fibra, peso, dibujo y forro.',
      fields: [
        sel('fibra', 'Tipo de fibra', [
          ['s100', 'Lana Super 100s', 'Resistente y de uso diario.'],
          ['s120', 'Lana Super 120s', 'El equilibrio clásico entre caída y durabilidad.'],
          ['s150', 'Lana Super 150s', 'Más fina y suave; pide más cuidado.'],
          ['lino', 'Lino', 'Fresco y con arrugas naturales.'],
          ['algodon', 'Algodón', 'Informal y transpirable.'],
          ['seda', 'Seda', 'Brillo natural, para ocasiones.'],
          ['cachemira', 'Cachemira', 'Suavidad y calidez excepcionales.'],
          ['lana_seda', 'Mezcla lana y seda'],
          ['lana_lino', 'Mezcla lana y lino'],
          ['lana_cach', 'Mezcla lana y cachemira']
        ], 's120'),
        sel('peso', 'Peso del tejido (gramaje)', [
          ['ligero', 'Ligero · 200–240 g', 'Primavera/verano o climas cálidos.'],
          ['medio', 'Medio · 250–290 g', 'Entretiempo: cuatro estaciones.'],
          ['pesado', 'Pesado · 300 g o más', 'Otoño/invierno: franelas y tweeds.']
        ], 'medio'),
        sel('patron', 'Diseño o patrón', [
          ['liso', 'Liso'],
          ['diplomatica', 'Raya diplomática (pinstripe)'],
          ['tiza', 'Raya tiza (chalk stripe)'],
          ['gales', 'Cuadro de Gales (Prince of Wales)'],
          ['perdiz', 'Ojo de perdiz (birdseye)'],
          ['espiga', 'Espiga (herringbone)'],
          ['ventana', 'Cuadro ventana (windowpane)']
        ]),
        sel('color', 'Color', [
          ['marino', 'Azul marino'], ['medianoche', 'Azul medianoche'], ['cobalto', 'Azul cobalto'],
          ['carbon', 'Gris carbón'], ['gris', 'Gris medio'], ['perla', 'Gris perla'], ['negro', 'Negro'],
          ['tabaco', 'Marrón tabaco'], ['oliva', 'Verde oliva'], ['arena', 'Beige arena'], ['burdeos', 'Burdeos']
        ], 'marino', { swatch: 'cloth' }),
        sel('acabado', 'Acabado', [
          ['mate', 'Mate'], ['satinado', 'Satinado'], ['texturizado', 'Texturizado']
        ]),
        group('Forro interior'),
        sel('forroEstr', 'Estructura del forro', [
          ['completo', 'Forro completo (full lining)', 'Más estructura y abrigo; el saco se desliza mejor.'],
          ['medio', 'Medio forro (half lining)', 'Más fresco: la espalda queda parcialmente sin forro.'],
          ['sin', 'Desestructurado / sin forro', 'Costuras ribeteadas a la vista; máxima ligereza.']
        ]),
        sel('forroMat', 'Material del forro', [
          ['cupro', 'Bemberg / Cupro', 'Transpirable y antiestático; el estándar de sastrería.'],
          ['seda', 'Seda'], ['viscosa', 'Viscosa']
        ]),
        sel('forroColor', 'Color y diseño del forro', [
          ['juego', 'A juego con el tejido'], ['burdeos', 'Contraste · burdeos'], ['oro', 'Contraste · dorado'],
          ['botella', 'Contraste · verde botella'], ['real', 'Contraste · azul real'], ['lavanda', 'Contraste · lavanda'],
          ['paisley', 'Estampado cachemir (paisley)'],
          ['personal', 'Estampado personalizado', 'Lo definimos contigo en la sesión.']
        ], 'juego', { swatch: 'lining' })
      ]
    },
    {
      id: 'saco', num: '02', stage: 'saco', title: 'Saco', lead: 'Estructura, botonadura, solapas, bolsillos y mangas.',
      fields: [
        group('Estructura y corte'),
        sel('construccion', 'Construcción interna', [
          ['full', 'Bespoke · lienzo completo flotante', 'Entretela de crin de caballo; el saco se amolda al cuerpo con el uso.'],
          ['half', 'Medio lienzo (half canvas)', 'Lienzo en pecho y solapa: estructura con ligereza.'],
          ['des', 'Desestructurado', 'Sin hombreras ni entretela: estilo napolitano relajado.']
        ], 'half'),
        sel('botonadura', 'Botonadura', [
          ['sb1', 'Sencilla · 1 botón'], ['sb2', 'Sencilla · 2 botones'], ['sb3', 'Sencilla · 3 botones'],
          ['sb3r2', 'Sencilla · 3 botones (2-roll-3 napolitano)', 'La solapa rueda sobre el botón superior; se abrocha el central.'],
          ['db42', 'Cruzada · 4×2'], ['db62', 'Cruzada · 6×2'], ['db61', 'Cruzada · 6×1']
        ], 'sb2'),
        sel('hombro', 'Hombro', [
          ['hombrera', 'Con hombrera (estructurado)'],
          ['ingles', 'Inglés armado (con copa)', 'Cabeza de manga elevada, silueta marcada.'],
          ['camicia', 'Spalla camicia / rollino (napolitano)', 'Natural, sin hombrera, con frunce en la manga.']
        ]),
        group('Solapas y cuello'),
        sel('solapa', 'Tipo de solapa', [
          ['muesca', 'Muesca (notch)', 'Estándar, versátil y clásica.'],
          ['punta', 'Punta (peak)', 'Formal; estiliza la figura. Habitual en cruzados.'],
          ['chal', 'Chal (shawl)', 'Redonda, propia del esmoquin.']
        ]),
        sel('anchoSolapa', 'Ancho de la solapa', [
          ['estrecha', 'Estrecha · 6–7 cm'], ['estandar', 'Estándar · 8–9 cm'], ['ancha', 'Ancha · 10 cm o más']
        ], 'estandar'),
        group('Bolsillos y aberturas'),
        sel('bolsilloPecho', 'Bolsillo de pecho', [
          ['recto', 'Recto clásico'], ['barchetta', 'Barchetta (ahuecado en barco)'], ['ninguno', 'Sin bolsillo de pecho']
        ]),
        sel('bolsillosInf', 'Bolsillos inferiores', [
          ['cartera', 'Con cartera (flap)'], ['ribete', 'De ribete (welt)'], ['parche', 'De parche (informal)']
        ], 'cartera', { half: true }),
        sel('orientacion', 'Orientación', [
          ['rectos', 'Rectos'], ['inclinados', 'Inclinados (hacking)']
        ], 'rectos', { half: true }),
        sel('aberturas', 'Aberturas posteriores', [
          ['dos', 'Dos laterales', 'Corte británico / italiano moderno, muy cómodo.'],
          ['una', 'Una central', 'Corte americano clásico.'],
          ['ninguna', 'Sin aberturas', 'Corte de etiqueta, formal.']
        ]),
        group('Puños'),
        sel('botonesPuno', 'Botones en el puño', [
          ['3', '3 botones'], ['4', '4 botones']
        ], '4', { half: true }),
        sel('disposicionPuno', 'Disposición', [
          ['separados', 'Separados'], ['kissing', 'Superpuestos (kissing)']
        ], 'separados', { half: true }),
        group('Camisa, corbata y chaleco'),
        sel('chaleco', 'Chaleco', [
          ['sin', 'Sin chaleco'], ['juego', 'Chaleco a juego (tres piezas)', 'Se ve entero con «Ver pantalón sin saco».']
        ]),
        sel('camisa', 'Camisa', [['blanca', 'Blanca'], ['celeste', 'Azul celeste']], 'blanca', { half: true, swatch: 'shirt' }),
        sel('corbata', 'Corbata', [
          ['auto', 'Según el tejido'], ['plata', 'Plata'], ['roja', 'Roja'], ['burdeos', 'Burdeos'], ['marino', 'Azul marino']
        ], 'auto', { half: true, swatch: 'tie' })
      ],
      addons: [
        ['ticket', 'Bolsillo relojero (ticket pocket)', 'Tercer bolsillo pequeño sobre el bolsillo derecho.'],
        ['milanes', 'Ojal de solapa milanés', 'Cosido a mano, en relieve, con el hilo elegido.'],
        ['operativos', 'Ojales de puño operativos', 'Puños practicables: se pueden desabrochar.']
      ]
    },
    {
      id: 'pantalon', num: '03', stage: 'pantalon', title: 'Pantalón', lead: 'Cintura, pinzas, bolsillos y largo.',
      fields: [
        group('Cintura y ajuste'),
        sel('tiro', 'Tiro', [['alto', 'Alto'], ['medio', 'Medio'], ['bajo', 'Bajo']], 'medio'),
        sel('cintura', 'Cierre de la cintura', [
          ['trabillas', 'Trabillas para cinturón'],
          ['hebilla', 'Ajustadores laterales de hebilla', 'Sin cinturón: el ajuste va a los costados.'],
          ['botonAj', 'Ajustadores laterales de botón', 'Sin cinturón: el ajuste va a los costados.']
        ]),
        sel('tirantes', 'Botones para tirantes', [
          ['ninguno', 'Sin botones para tirantes'], ['interiores', 'Interiores'], ['exteriores', 'Exteriores']
        ]),
        sel('cierre', 'Cierre frontal', [['cremallera', 'Cremallera'], ['botones', 'Botonadura oculta']], 'cremallera', { half: true }),
        sel('extension', 'Extensión de pretina', [['boton', 'Con botón'], ['broche', 'Con broche'], ['sin', 'Sin extensión']], 'boton', { half: true }),
        group('Pliegues y bolsillos'),
        sel('pinzas', 'Pinzas', [
          ['flat', 'Sin pinzas (flat front)'],
          ['1in', '1 pinza hacia adentro (francés)'], ['1out', '1 pinza hacia afuera (inglés)'],
          ['2in', '2 pinzas hacia adentro (francés)'], ['2out', '2 pinzas hacia afuera (inglés)']
        ]),
        sel('bolsDel', 'Bolsillos delanteros', [
          ['diagonal', 'En diagonal (francés)'], ['vertical', 'Verticales sobre la costura']
        ]),
        sel('bolsTras', 'Bolsillos traseros', [
          ['2b', 'Dos, con botón'], ['2', 'Dos, sin botón'], ['1b', 'Uno, con botón'], ['1', 'Uno, sin botón'], ['0', 'Ninguno']
        ]),
        group('Largo y bastilla'),
        sel('quiebre', 'Quiebre sobre el zapato', [
          ['sin', 'Sin quiebre (no break)'], ['medio', 'Medio quiebre'], ['completo', 'Quiebre completo']
        ], 'medio'),
        sel('terminacion', 'Terminación', [
          ['lisa', 'Lisa'], ['v35', 'Valenciana 3,5 cm'], ['v40', 'Valenciana 4 cm'], ['v45', 'Valenciana 4,5 cm']
        ])
      ]
    },
    {
      id: 'medidas', num: '04', stage: 'traje', title: 'Medidas y morfología',
      lead: 'Las tomamos en la sesión de sastrería. Si ya las conoces puedes adelantarlas; todos los campos son opcionales.',
      fields: [
        group('Análisis postural'),
        sel('hombrosPost', 'Inclinación de hombros', [
          ['regulares', 'Regulares'], ['caidos', 'Caídos'], ['erguidos', 'Erguidos (cuadrados)'], ['asimetricos', 'Asimétricos']
        ]),
        sel('espalda', 'Curvatura de la espalda', [['neutra', 'Neutra'], ['erguida', 'Erguida'], ['encorvada', 'Encorvada']], 'neutra', { half: true }),
        sel('brazos', 'Posición de los brazos', [['neutros', 'Neutros'], ['adelantados', 'Adelantados'], ['atrasados', 'Atrasados']], 'neutros', { half: true }),
        sel('abdomen', 'Abdomen', [['regular', 'Regular'], ['plano', 'Plano'], ['prominente', 'Prominente']], 'regular', { half: true }),
        sel('gluteos', 'Glúteos', [['regular', 'Regular'], ['planos', 'Planos'], ['prominentes', 'Prominentes']], 'regular', { half: true }),
        group('Puntos de medida'),
        num('mTorax', 'Contorno de tórax'), num('mCintura', 'Cintura'),
        num('mCadera', 'Cadera'), num('mLargoSaco', 'Largo de saco'),
        num('mHombros', 'Ancho de hombros'), num('mManga', 'Largo de manga'),
        num('mTiro', 'Tiro del pantalón'), num('mMuslo', 'Muslo'),
        num('mRodilla', 'Rodilla'), num('mBastilla', 'Ancho de bastilla')
      ]
    },
    {
      id: 'merceria', num: '05', stage: 'saco', title: 'Mercería y acabados', lead: 'Hilos, botones, fieltro del cuello y bordados.',
      fields: [
        sel('hilo', 'Hilo de ojales y costuras', [
          ['juego', 'A juego con el tejido'], ['burdeos', 'Contraste · burdeos'], ['rojo', 'Contraste · rojo'],
          ['celeste', 'Contraste · celeste'], ['oro', 'Contraste · dorado'], ['crema', 'Contraste · crema']
        ], 'juego', { swatch: 'thread' }),
        sel('botones', 'Botones', [
          ['cuernoOsc', 'Cuerno natural · oscuro'], ['cuernoCl', 'Cuerno natural · claro'], ['hueso', 'Hueso'],
          ['corozo', 'Corozo · tono a juego'], ['madreperla', 'Madreperla'], ['oro', 'Metal · dorado'], ['plata', 'Metal · plateado']
        ], 'cuernoOsc', { swatch: 'button' }),
        sel('fieltro', 'Bajo cuello (fieltro / melton)', [
          ['juego', 'A juego con el tejido'], ['gris', 'Contraste · gris'], ['burdeos', 'Contraste · burdeos'],
          ['camel', 'Contraste · camel'], ['verde', 'Contraste · verde']
        ], 'juego', { swatch: 'felt', hint: 'Se ve al levantar el cuello; mira la vista «Interior».' })
      ],
      addons: [
        ['amf', 'Picado a mano en bordes (AMF)', 'Pespunte visible a lo largo de solapas y delanteros.'],
        ['monograma', 'Monograma bordado', 'Iniciales o una fecha bordadas.']
      ],
      after: [
        { id: 'monoTexto', type: 'text', label: 'Texto del monograma', def: '', placeholder: 'Ej. J.M.R. o 12·10·26', maxlength: 14, half: true, showIf: function (s) { return s.monograma; } },
        sel('monoUbic', 'Ubicación', [
          ['interior', 'Interior del saco'], ['cuello', 'Debajo del cuello'], ['pretina', 'Pretina del pantalón']
        ], 'interior', { half: true, showIf: function (s) { return s.monograma; } })
      ]
    }
  ];

  var PRESETS = [
    ['', 'Personalizado'],
    ['negocios', 'Clásico de negocios', {}],
    ['napolitano', 'Napolitano relajado', {
      fibra: 'lana_lino', peso: 'ligero', patron: 'perdiz', color: 'gris', construccion: 'des', botonadura: 'sb3r2',
      hombro: 'camicia', bolsilloPecho: 'barchetta', bolsillosInf: 'parche', forroEstr: 'medio', forroColor: 'lavanda',
      pinzas: '2in', cintura: 'botonAj', terminacion: 'v40', quiebre: 'sin', botones: 'cuernoCl', anchoSolapa: 'estandar'
    }],
    ['ingles', 'Inglés cruzado', {
      fibra: 's150', peso: 'pesado', patron: 'diplomatica', color: 'carbon', construccion: 'full', botonadura: 'db62',
      solapa: 'punta', anchoSolapa: 'ancha', hombro: 'ingles', orientacion: 'inclinados', tiro: 'alto', cintura: 'hebilla',
      tirantes: 'interiores', pinzas: '2out', terminacion: 'v45', forroColor: 'burdeos', ticket: true, milanes: true, operativos: true
    }],
    ['gales', 'Príncipe de Gales', {
      fibra: 's120', peso: 'medio', patron: 'gales', color: 'gris', botonadura: 'sb2', solapa: 'muesca',
      orientacion: 'inclinados', ticket: true, pinzas: '1in', terminacion: 'v40', forroColor: 'botella', fieltro: 'verde', botones: 'cuernoCl'
    }],
    ['esmoquin', 'Esmoquin', {
      fibra: 's150', patron: 'liso', color: 'negro', acabado: 'satinado', construccion: 'full', botonadura: 'sb1',
      solapa: 'chal', bolsillosInf: 'ribete', aberturas: 'ninguna', cintura: 'botonAj', tirantes: 'interiores',
      quiebre: 'sin', forroMat: 'seda', botones: 'corozo'
    }],
    ['verano', 'Verano en lino', {
      fibra: 'lino', peso: 'ligero', color: 'arena', acabado: 'texturizado', construccion: 'des', hombro: 'camicia',
      forroEstr: 'sin', bolsilloPecho: 'barchetta', bolsillosInf: 'parche', pinzas: '1in', quiebre: 'sin', terminacion: 'v40',
      botones: 'cuernoOsc'
    }]
  ];

  // Trajes de la casa: [id, nombre, estilo base (PRESETS), foto, cambios sobre el estilo]. Únicos pedidos de invitados.
  var SUITS = [
    ['marino-diplomatica', 'Azul marino · raya diplomática', 'negocios', 'SacoMarino_CorbataPlata_CamisaBlanca_diplomatica_pinstripe.jpg',
      { patron: 'diplomatica', color: 'marino', camisa: 'blanca', corbata: 'plata' }],
    ['negro-chaleco', 'Negro liso con chaleco', 'negocios', 'SacoNegro_ChalecoNegro__CorbataRoja_CamisaBlanca_clasico.jpg',
      { patron: 'liso', color: 'negro', chaleco: 'juego', camisa: 'blanca', corbata: 'roja' }],
    ['gris-tweed', 'Gris carbón · tweed', 'napolitano', 'SacoGris_CorbataPlata_CamisaAzul_tweed.jpg',
      { fibra: 's100', peso: 'pesado', patron: 'liso', color: 'carbon', acabado: 'texturizado', camisa: 'celeste', corbata: 'plata' }]
  ];
  var GUEST_STYLES = ['negocios', 'napolitano'];

  /* Etapas de la vista previa: encuadre (viewBox) por etapa y vista */
  var FULL = [40, 30, 320, 736], INSIDE = [50, 36, 300, 440];
  var STAGES = {
    traje: { label: 'Traje completo', box: { front: FULL, back: FULL, inside: INSIDE }, focus: 'color' },
    saco: { label: 'Saco · primer plano', box: { front: [44, 36, 312, 392], back: [44, 36, 312, 392], inside: INSIDE }, focus: 'solapa' },
    pantalon: { label: 'Pantalón · primer plano', box: { front: [96, 304, 208, 462], back: [96, 304, 208, 462], inside: [110, 404, 180, 64] }, focus: 'pinzas' }
  };
  // Recuadro de detalle por campo: [vista, sin saco, recorte del viewBox]
  var TELA = [254, 180, 42, 42], HOMBRO = [52, 52, 104, 104], SOLAPA = [138, 40, 124, 124], BOLS = [100, 268, 100, 80],
    PUNO = [44, 318, 64, 58], CINT = [118, 318, 164, 56], PINZ = [118, 335, 96, 90], BAJO = [104, 668, 112, 96];
  var FOCUS = {
    fibra: ['front', 0, TELA], peso: ['front', 0, TELA], patron: ['front', 0, TELA], color: ['front', 0, TELA], acabado: ['front', 0, TELA],
    forroEstr: ['inside', 0, [96, 170, 208, 240]], forroMat: ['inside', 0, [130, 110, 140, 140]], forroColor: ['inside', 0, [130, 110, 140, 140]],
    construccion: ['front', 0, HOMBRO], hombro: ['front', 0, HOMBRO], botonadura: ['front', 0, [130, 190, 140, 150]],
    solapa: ['front', 0, SOLAPA], anchoSolapa: ['front', 0, SOLAPA], bolsilloPecho: ['front', 0, [236, 132, 58, 48]],
    bolsillosInf: ['front', 0, BOLS], orientacion: ['front', 0, BOLS], ticket: ['front', 0, BOLS], aberturas: ['back', 0, [96, 290, 208, 120]],
    botonesPuno: ['front', 0, PUNO], disposicionPuno: ['front', 0, PUNO], operativos: ['front', 0, PUNO], milanes: ['front', 0, [205, 95, 50, 45]],
    chaleco: ['front', 1, [118, 40, 164, 330]], camisa: ['front', 0, [164, 40, 72, 90]], corbata: ['front', 0, [164, 40, 72, 120]],
    tiro: ['front', 1, [110, 300, 180, 120]], cintura: ['front', 1, CINT], tirantes: ['front', 1, CINT], cierre: ['front', 1, [176, 322, 56, 70]],
    extension: ['front', 1, [176, 322, 56, 50]], pinzas: ['front', 1, PINZ], bolsDel: ['front', 1, PINZ], bolsTras: ['back', 1, [130, 365, 140, 70]],
    quiebre: ['front', 0, BAJO], terminacion: ['front', 0, BAJO],
    hombrosPost: ['front', 0, [50, 40, 300, 140]], abdomen: ['front', 0, [80, 200, 240, 170]],
    hilo: ['front', 0, [176, 80, 80, 80]], botones: ['front', 0, [160, 228, 80, 96]], fieltro: ['inside', 0, [160, 40, 80, 50]],
    amf: ['front', 0, [150, 70, 100, 100]], monograma: ['inside', 0, null], monoTexto: ['inside', 0, null], monoUbic: ['inside', 0, null]
  };
  var MONO_CROP = { interior: [150, 145, 100, 40], cuello: [170, 52, 60, 30], pretina: [150, 420, 100, 40] };

  /* 2. Paletas -------------------------------------------------------------- */
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

  /* 3. Estado --------------------------------------------------------------- */
  var ALL_FIELDS = [];
  var ADDONS = [];
  var ADDON_LABEL = {};
  SCHEMA.forEach(function (sec) {
    sec.fields.concat(sec.after || []).forEach(function (f) { if (f.id) ALL_FIELDS.push(f); });
    (sec.addons || []).forEach(function (a) { ADDONS.push(a[0]); ADDON_LABEL[a[0]] = a[1]; });
  });

  function defaults() {
    var d = {};
    ALL_FIELDS.forEach(function (f) { d[f.id] = f.def; });
    ADDONS.forEach(function (id) { d[id] = false; });
    return d;
  }

  var state = defaults();
  var ui = { view: 'front', hideJacket: false, stage: 'traje', focus: null, suit: null, vb: null, vbTarget: null };
  var access = { member: false };
  var FIELD_SEC = {};
  SCHEMA.forEach(function (sec) {
    sec.fields.concat(sec.after || []).forEach(function (f) { if (f.id) FIELD_SEC[f.id] = sec; });
    (sec.addons || []).forEach(function (a) { FIELD_SEC[a[0]] = sec; });
  });

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
    if (s.chaleco === 'juego' && !g.db) {
      // Chaleco asomando en la V del saco (las solapas, dibujadas después, tapan sus bordes)
      var rx = function (y) { return r1(188 + 12 * (y - 62) / (yb - 62)); }, top = Math.min(112, yb - 70);
      o += cloth('M' + (rx(top) - 4) + ' ' + top + 'L200 ' + (yb - 30) + 'L' + r1(404 - rx(top)) + ' ' + top + 'L206 ' + (yb + 2) + 'L194 ' + (yb + 2) + 'Z', c, 0.8);
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

  // vest: el chaleco se dibuja sin saco salvo en la etapa Pantalón, donde taparía pretina y pinzas
  function scene(s, view, hide, vest) {
    var g = geo(s), c = palette(s), body = shoes(c), back = view === 'back';
    if (view === 'inside') {
      body = jacketInside(s, g, c);
    } else if (hide) {
      body += shirtTorso(s, g, c, back) + trousers(s, g, c, back) + (vest && s.chaleco === 'juego' ? vestTorso(s, g, c, back) : '');
    } else {
      body += trousers(s, g, c, back) + (back ? jacketBack(s, g, c) : jacketFront(s, g, c));
    }
    return defs(s, c) + body;
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
      inside: 'interior: forro, fieltro y monograma'
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
    var id = ui.focus || STAGES[ui.stage].focus, f = FOCUS[id] || FOCUS[STAGES[ui.stage].focus];
    var crop = f[2] || MONO_CROP[state.monoUbic];
    var k = 'd';
    var inner = scene(state, f[0], !!f[1], id === 'chaleco').replace(/id="([^"]+)"/g, 'id="$1-' + k + '"').replace(/url\(#([^)]+)\)/g, 'url(#$1-' + k + ')');
    var el = $('#am-detail-svg');
    el.setAttribute('viewBox', crop.join(' '));
    el.innerHTML = inner;
    var fd = ALL_FIELDS.filter(function (x) { return x.id === id; })[0];
    var ad = ADDON_LABEL[id];
    $('#am-detail-cap').textContent = fd ? fd.label : ad || 'Detalle';
  }

  /* 6. Formulario ----------------------------------------------------------- */
  var LOCK = '<svg class="am-lock" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1.2"/>' +
    '<path d="M3.6 6V4.3a2.4 2.4 0 0 1 4.8 0V6" fill="none"/></svg>';
  function $(q) { return document.querySelector(q); }
  function $$(q) { return Array.prototype.slice.call(document.querySelectorAll(q)); }

  function fieldHTML(f) {
    if (f.type === 'group') return '<p class="am-group">' + f.label + '</p>';
    var cls = 'am-field' + (f.half ? ' am-field--half' : '');
    var label = '<span class="am-field__label">' + (f.swatch ? '<span class="am-swatch" data-swatch="' + f.swatch + '"></span>' : '') + f.label + LOCK + '</span>';
    var control;
    if (f.type === 'select') {
      control = '<select name="' + f.id + '">' + f.options.map(function (o) {
        return '<option value="' + o[0] + '">' + o[1] + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'number') {
      control = '<span class="am-unit"><input type="number" name="' + f.id + '" inputmode="decimal" min="0" max="250" step="0.5" placeholder="—"></span>';
    } else {
      control = '<input type="text" name="' + f.id + '" maxlength="' + f.maxlength + '" placeholder="' + esc(f.placeholder || '') + '">';
    }
    return '<label class="' + cls + '" data-field="' + f.id + '">' + label + control + '<span class="am-field__hint" data-hint="' + f.id + '"></span></label>';
  }

  function buildForm() {
    $('#am-form').innerHTML = SCHEMA.map(function (sec, i) {
      return '<details class="am-sec" id="sec-' + sec.id + '" data-stage="' + sec.stage + '"' + (i < 2 ? ' open' : '') + '>' +
        '<summary><span class="am-sec__num">' + sec.num + '</span><span class="am-sec__title">' + sec.title + '</span><span class="am-sec__chev" aria-hidden="true"></span></summary>' +
        '<div class="am-sec__body">' + (sec.lead ? '<p class="am-sec__lead">' + sec.lead + '</p>' : '') +
        '<div class="am-fields">' + sec.fields.map(fieldHTML).join('') + '</div>' +
        (sec.addons ? '<fieldset class="am-addons"><legend>Complementos</legend>' + sec.addons.map(function (a) {
          return '<label class="am-check" data-field="' + a[0] + '"><input type="checkbox" name="' + a[0] + '"><span class="am-check__text"><strong>' + a[1] + LOCK + '</strong><small>' + a[2] + '</small></span></label>';
        }).join('') + '</fieldset>' : '') +
        (sec.after ? '<div class="am-fields" style="margin-top:.9rem">' + sec.after.map(fieldHTML).join('') + '</div>' : '') +
        '</div></details>';
    }).join('');
    buildPresets();
  }

  // Punto de partida. Invitados: los trajes de la casa agrupados por estilo; el resto se ve pero no se puede elegir.
  function buildPresets() {
    var opt = function (v, t, off) { return '<option value="' + v + '"' + (off ? ' disabled' : '') + '>' + t + '</option>'; };
    var suits = function (style) {
      return SUITS.filter(function (x) { return !style || x[2] === style; }).map(function (x) { return opt('traje:' + x[0], x[1]); }).join('');
    };
    var html;
    if (access.member) {
      html = '<optgroup label="Trajes de la casa">' + suits() + '</optgroup><optgroup label="Estilos">' +
        PRESETS.map(function (p) { return opt(p[0], p[1]); }).join('') + '</optgroup>';
    } else {
      html = GUEST_STYLES.map(function (id) {
        return '<optgroup label="' + PRESETS.filter(function (p) { return p[0] === id; })[0][1] + '">' + suits(id) + '</optgroup>';
      }).join('') + '<optgroup label="Solo miembros">' + PRESETS.filter(function (p) { return GUEST_STYLES.indexOf(p[0]) < 0; })
        .map(function (p) { return opt(p[0], p[1] + ' · miembros', true); }).join('') + '</optgroup>';
    }
    $('#am-preset').innerHTML = html;
    $('#am-preset-hint').textContent = access.member
      ? 'Carga un traje de la casa o un estilo completo y ajústalo a tu gusto.'
      : 'Como invitado puedes pedir uno de los tres trajes de la casa. La personalización es para miembros.';
    $('#am-preset').value = ui.suit ? 'traje:' + ui.suit : '';
  }

  // Invitados: todo campo del formulario queda bloqueado
  function locked() { return !access.member; }
  function applyLocks() {
    $$('#am-form [data-field]').forEach(function (el) {
      el.classList.toggle('is-locked', locked());
      var ctl = el.querySelector('select, input');
      if (locked()) ctl.setAttribute('aria-disabled', 'true'); else ctl.removeAttribute('aria-disabled');
    });
    $('#constructor').classList.toggle('is-guest', locked());
  }

  function syncForm() {
    var form = $('#am-form');
    ALL_FIELDS.forEach(function (f) { if (form.elements[f.id]) form.elements[f.id].value = state[f.id]; });
    ADDONS.forEach(function (id) { form.elements[id].checked = !!state[id]; });
  }

  function refreshFieldUI() {
    var c = palette(state);
    ALL_FIELDS.forEach(function (f) {
      var el = $('[data-field="' + f.id + '"]');
      if (f.showIf) el.hidden = !f.showIf(state);
      var hint = $('[data-hint="' + f.id + '"]');
      if (!hint) return;
      var opt = f.options && f.options.filter(function (o) { return o[0] === state[f.id]; })[0];
      hint.textContent = (opt && opt[2]) || f.hint || '';
    });
    var sw = { cloth: c.base, lining: c.lining, thread: c.thread, felt: c.felt, button: c.button.fill, shirt: c.shirt.fill, tie: c.tie };
    $$('[data-swatch]').forEach(function (el) { el.style.background = sw[el.getAttribute('data-swatch')]; });
    var toggle = $('.am-toggle');
    toggle.classList.toggle('is-disabled', ui.view === 'inside' || ui.stage === 'pantalon');
    $('#am-hide-jacket').checked = hidden();
    $$('.am-stages button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-stage') === ui.stage)); });
    var suit = suitById(ui.suit), photo = $('#am-photo');
    photo.hidden = !suit;
    if (suit) { photo.querySelector('img').src = CONFIG.photos + suit[3]; photo.querySelector('img').alt = 'Foto del traje ' + suit[1]; }
  }

  /* 7. Ficha técnica y notas del sastre ------------------------------------- */
  function optLabel(f, v) {
    var o = f.options.filter(function (x) { return x[0] === v; })[0];
    return o ? o[1] : v;
  }

  function summaryData() {
    return SCHEMA.map(function (sec) {
      var rows = [];
      sec.fields.concat(sec.after || []).forEach(function (f) {
        if (!f.id || (f.showIf && !f.showIf(state))) return;
        var v = state[f.id];
        if (f.type === 'select') rows.push([f.label, optLabel(f, v)]);
        else if (v !== '' && v != null) rows.push([f.label, f.type === 'number' ? String(v).replace('.', ',') + ' cm' : v]);
      });
      if (sec.id === 'medidas' && !sec.fields.some(function (f) { return f.type === 'number' && state[f.id] !== ''; })) {
        rows.push(['Medidas', 'Se toman en la sesión']);
      }
      var add = (sec.addons || []).filter(function (a) { return state[a[0]]; }).map(function (a) { return a[1]; });
      if (sec.addons) rows.push(['Complementos', add.length ? add.join(' · ') : 'Ninguno']);
      return { num: sec.num, title: sec.title, rows: rows };
    });
  }

  function notes(s) {
    var n = [];
    var formal = s.solapa === 'chal' || s.aberturas === 'ninguna';
    if (s.solapa === 'chal' && ['negro', 'medianoche', 'marino', 'burdeos'].indexOf(s.color) < 0) n.push('La solapa chal es propia del esmoquin; luce mejor en negro, azul medianoche o burdeos.');
    if (s.bolsillosInf === 'parche' && formal) n.push('Los bolsillos de parche son informales y chocan con un corte de etiqueta.');
    if (s.fibra === 'lino' && s.peso === 'pesado') n.push('El lino rara vez se teje en pesos de invierno; considera una mezcla de lana y lino.');
    if (s.construccion === 'des' && s.hombro === 'hombrera') n.push('Un saco desestructurado suele llevar hombro natural (spalla camicia).');
    if (s.botonadura.charAt(0) === 'd' && s.aberturas === 'una') n.push('Los cruzados suelen llevar dos aberturas o ninguna: una central tiende a abrirse.');
    if (s.cintura === 'trabillas' && s.tirantes !== 'ninguno') n.push('Con tirantes lo habitual es prescindir de trabillas; prueba los ajustadores laterales.');
    if (s.pinzas === 'flat' && s.tiro === 'alto') n.push('Un tiro alto gana comodidad con una o dos pinzas.');
    if (s.chaleco === 'juego' && s.botonadura.charAt(0) === 'd') n.push('Con saco cruzado el chaleco queda oculto; el tres piezas suele pedirse con saco sencillo.');
    if (s.monograma && !s.monoTexto.trim()) n.push('Escribe el texto del monograma para verlo en la vista «Interior».');
    return n;
  }

  function renderSummary() {
    var suit = suitById(ui.suit);
    $('#am-summary').innerHTML = (suit ? '<p class="am-suitline"><span>Traje de la casa</span>' + esc(suit[1]) + '</p>' : '') + summaryData().map(function (sec) {
      return '<div><h3><span>' + sec.num + '</span>' + sec.title + '</h3><dl>' + sec.rows.map(function (r) {
        return '<div class="am-row"><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl></div>';
    }).join('');
    var n = notes(state);
    $('#am-notes').innerHTML = n.length ? '<strong>Notas del sastre</strong>' + n.map(function (t) { return '<p>' + t + '</p>'; }).join('') : '';
  }

  function summaryText() {
    var suit = suitById(ui.suit);
    var out = ['JUSTO by Casa Siego® · Traje a medida', 'Ficha generada el ' + new Date().toLocaleDateString('es-MX'), ''];
    if (suit) out.push('Traje de la casa: ' + suit[1] + (access.member ? '' : ' (pedido de invitado)'), '');
    summaryData().forEach(function (sec) {
      out.push(sec.num + ' · ' + sec.title.toUpperCase());
      sec.rows.forEach(function (r) { out.push('  ' + r[0] + ': ' + r[1]); });
      out.push('');
    });
    out.push('Configuración: ' + shareURL());
    return out.join('\n');
  }

  /* 8. Enlace para compartir (estado en el hash) ---------------------------- */
  function encodeState() {
    var d = defaults(), diff = {};
    Object.keys(state).forEach(function (k) { if (state[k] !== d[k]) diff[k] = state[k]; });
    return btoa(unescape(encodeURIComponent(JSON.stringify(diff)))).replace(/=+$/, '');
  }
  function shareURL() {
    var base = location.href.split('#')[0];
    return !access.member && ui.suit ? base + '#t=' + ui.suit : base + '#c=' + encodeState();
  }
  function loadHash() {
    var t = location.hash.match(/#t=([a-z-]+)/);
    if (t && suitById(t[1])) { applySuit(t[1], true); return; }
    var m = location.hash.match(/#c=([A-Za-z0-9+/]+)/);
    if (!m || !access.member) return;
    try {
      var diff = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      Object.keys(diff).forEach(function (k) { if (k in state) state[k] = diff[k]; });
    } catch (e) { /* enlace dañado: se ignora */ }
  }

  /* 9. Acciones ------------------------------------------------------------- */
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
    var send = $('#am-send');
    if (CONFIG.contactEmail) {
      var body = summaryText();
      if (body.length > 1800) body = body.slice(0, 1800) + '\n…';
      send.href = 'mailto:' + CONFIG.contactEmail + '?subject=' + encodeURIComponent(CONFIG.subject) + '&body=' + encodeURIComponent(body);
    } else {
      send.hidden = true;
    }
  }

  function onInput(e) {
    var el = e.target;
    if (!el.name) return;
    if (locked()) { syncForm(); return; }
    state[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    ui.suit = null;
    $('#am-preset').value = '';
    focusField(el.name);
  }

  function suitById(id) { return SUITS.filter(function (x) { return x[0] === id; })[0]; }

  function applySuit(id, quiet) {
    var x = suitById(id), p = PRESETS.filter(function (y) { return y[0] === x[2]; })[0];
    var keep = {};
    if (access.member) {
      ALL_FIELDS.forEach(function (f) { if (f.type === 'number' || f.type === 'text' || f.id === 'monoUbic') keep[f.id] = state[f.id]; });
      keep.monograma = state.monograma;
    }
    state = Object.assign(defaults(), p[2], x[4], keep);
    ui.suit = id;
    $('#am-preset').value = 'traje:' + id;
    syncForm();
    update();
    if (!quiet) toast('Traje cargado: ' + x[1]);
  }

  function applyPreset(id) {
    if (id.indexOf('traje:') === 0) { applySuit(id.slice(6)); return; }
    if (!access.member) return;
    var p = PRESETS.filter(function (x) { return x[0] === id; })[0];
    if (!p || !p[2]) return;
    var keep = {};
    ALL_FIELDS.forEach(function (f) { if (f.type === 'number' || f.type === 'text' || f.id === 'monoUbic') keep[f.id] = state[f.id]; });
    keep.monograma = state.monograma;
    ['hombrosPost', 'espalda', 'brazos', 'abdomen', 'gluteos'].forEach(function (k) { keep[k] = state[k]; });
    state = Object.assign(defaults(), p[2], keep);
    ui.suit = null;
    syncForm();
    update();
    toast('Estilo cargado: ' + p[1]);
  }

  /* 10. Etapas, foco y avisos ------------------------------------------------ */
  function setStage(stage) {
    if (ui.stage === stage) return;
    ui.stage = stage;
    if (stage === 'pantalon' && ui.view === 'inside') ui.view = 'front';
    syncViewTabs();
  }
  function syncViewTabs() {
    $$('.am-views button').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-view') === ui.view)); });
  }
  // Un campo lleva a la etapa de su sección y pone su primer plano en el recuadro de detalle
  function focusField(id) {
    var sec = FIELD_SEC[id];
    if (sec) setStage(sec.stage);
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
  function mailto(subject, body) {
    return 'mailto:' + CONFIG.contactEmail + '?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
  }
  function lockNotice(id) {
    var f = ALL_FIELDS.filter(function (x) { return x.id === id; })[0];
    var name = f ? f.label : ADDON_LABEL[id] || 'Esta opción';
    var suit = suitById(ui.suit);
    var ctx = suit ? 'Me interesa el traje de la casa «' + suit[1] + '» y quiero personalizar: ' + name + '.' : 'Quiero personalizar: ' + name + '.';
    openModal(
      '<p class="eyebrow">Opción reservada</p>' +
      '<h2 class="am-modal__title" id="am-modal-title">Personaliza con la sastrería</h2>' +
      '<p class="am-modal__lede">«' + esc(name) + '» se elige con el sastre. Como invitado puedes pedir los tres trajes de la casa tal como son; para cambiar cualquier detalle, elige cómo seguir:</p>' +
      '<div class="am-modal__options">' +
        '<a class="am-option" href="' + mailto(CONFIG.measureSubject, ctx + '\n\nMe gustaría agendar una toma de medidas.') + '">' +
          '<strong>Toma de medidas</strong><span>Una sesión con el sastre: medidas, caída y cada detalle del traje.</span></a>' +
        '<a class="am-option" href="' + mailto(CONFIG.membershipSubject, ctx + '\n\nMe gustaría conocer la Membresía Casa Siego.') + '">' +
          '<strong>Membresía Casa Siego</strong><span>El constructor completo: todos los estilos, tejidos y acabados.</span></a>' +
      '</div>' +
      '<p class="am-modal__fine">¿Ya eres miembro? <a href="' + CONFIG.signIn + '">Inicia sesión</a> y vuelve a esta página.</p>');
  }
  function photoNotice() {
    var suit = suitById(ui.suit);
    if (!suit) return;
    openModal('<figure class="am-modal__photo"><img src="' + CONFIG.photos + suit[3] + '" alt="Foto del traje ' + esc(suit[1]) + '" width="922" height="1152">' +
      '<figcaption><span id="am-modal-title">' + esc(suit[1]) + '</span> · traje de la casa</figcaption></figure>', true);
  }

  // Miembro = sesión válida de Supabase (la misma de la portada; js/acceso-config.js). Sin configurar: invitado.
  function checkMember() {
    var cfg = window.CASASIEGO_ACCESO || {};
    if (!cfg.supabaseUrl || !cfg.publishableKey) return;
    var s = document.createElement('script');
    s.src = cfg.supabaseJs; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = function () {
      window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      }).auth.getSession().then(function (res) {
        if (!res || !res.data || !res.data.session) return;
        access.member = true;
        buildPresets();
        applyLocks();
        update();
        toast('Sesión de miembro: constructor completo');
      }, function () { /* sin sesión: invitado */ });
    };
    document.head.appendChild(s);
  }

  function init() {
    buildForm();
    applyLocks();
    applySuit(SUITS[0][0], true);
    loadHash();
    syncForm();

    var form = $('#am-form');
    form.addEventListener('input', onInput);
    form.addEventListener('change', onInput);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    $('#am-preset').addEventListener('change', function (e) { applyPreset(e.target.value); });

    function setView(v) {
      ui.view = v;
      if (v === 'inside' && ui.stage === 'pantalon') ui.stage = 'saco';
      syncViewTabs();
    }
    $$('.am-stages button').forEach(function (b) {
      b.addEventListener('click', function () { setStage(b.getAttribute('data-stage')); ui.focus = null; update(); });
    });
    // Abrir una sección lleva a su etapa
    $$('.am-sec > summary').forEach(function (sum) {
      sum.addEventListener('click', function () {
        if (sum.parentNode.open) return;
        setStage(sum.parentNode.getAttribute('data-stage'));
        ui.focus = null;
        update();
      });
    });
    form.addEventListener('focusin', function (e) {
      var el = e.target;
      if (el.name && FIELD_SEC[el.name] && el.name !== ui.focus) focusField(el.name);
    });
    // Campos bloqueados: el clic (o Enter / Espacio / flechas) abre el aviso en lugar del menú
    form.addEventListener('click', function (e) {
      var box = e.target.closest('.is-locked');
      if (!box) return;
      e.preventDefault();
      var id = box.getAttribute('data-field');
      if (id !== ui.focus) focusField(id);
      lockNotice(id);
    }, true);
    form.addEventListener('keydown', function (e) {
      var box = e.target.closest && e.target.closest('.is-locked');
      if (!box || ['Enter', ' ', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      e.preventDefault();
      lockNotice(box.getAttribute('data-field'));
    });
    $('#am-photo').addEventListener('click', photoNotice);
    $('#am-modal').addEventListener('click', function (e) {
      if (e.target === e.currentTarget || e.target.closest('.am-modal__close')) closeModal();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    $$('.am-views button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); update(); });
    });
    // ?vista=espalda | interior abre directamente esa vista
    var vista = { frente: 'front', espalda: 'back', interior: 'inside' }[new URLSearchParams(location.search).get('vista')];
    if (vista) setView(vista);
    $('#am-hide-jacket').addEventListener('change', function (e) {
      if (ui.stage === 'pantalon') { e.target.checked = true; return; }
      ui.hideJacket = e.target.checked; update();
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
      if (!access.member) { applySuit(SUITS[0][0], true); toast('Configuración reiniciada'); return; }
      state = defaults();
      ui.suit = null;
      $('#am-preset').value = '';
      syncForm();
      update();
      toast('Configuración reiniciada');
    });

    // Al iniciar: del saco al traje completo
    ui.vbTarget = null;
    setBox(STAGES.saco.box[ui.view].slice());
    setTimeout(update, 250);
    checkMember();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
