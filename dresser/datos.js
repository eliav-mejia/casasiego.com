/* Dresser · datos: medidas (deslizadores), cuerpos predefinidos y tabla de la camisa.
   Todas las medidas en cm. Los contornos (cuello, pecho, cintura…) son perímetros; hombros es de punta a punta por la espalda. */
window.DRESSER = {
  medidas: [
    { id: 'altura',      nombre: 'Estatura',       grupo: 'General', min: 145, max: 205, paso: 0.5, ayuda: 'De la coronilla al suelo, descalzo.' },
    { id: 'cuello',      nombre: 'Cuello',         grupo: 'Torso',   min: 28,  max: 50,  paso: 0.5, ayuda: 'Contorno en la base del cuello, donde cierra el botón.' },
    { id: 'hombros',     nombre: 'Hombros',        grupo: 'Torso',   min: 34,  max: 56,  paso: 0.5, ayuda: 'De punta a punta de hombro, por la espalda.' },
    { id: 'pecho',       nombre: 'Pecho', nombreM: 'Busto', grupo: 'Torso', min: 70, max: 140, paso: 0.5, ayuda: 'Contorno en la parte más ancha, bajo las axilas.' },
    { id: 'cintura',     nombre: 'Cintura',        grupo: 'Torso',   min: 55,  max: 135, paso: 0.5, ayuda: 'Contorno a la altura del ombligo, sin apretar.' },
    { id: 'cadera',      nombre: 'Cadera',         grupo: 'Torso',   min: 75,  max: 145, paso: 0.5, ayuda: 'Contorno en la parte más ancha de los glúteos.' },
    { id: 'brazo',       nombre: 'Largo de brazo', grupo: 'Brazos',  min: 48,  max: 72,  paso: 0.5, ayuda: 'Del hueso del hombro a la muñeca, brazo relajado.' },
    { id: 'biceps',      nombre: 'Bíceps',         grupo: 'Brazos',  min: 20,  max: 48,  paso: 0.5, ayuda: 'Contorno en la parte más ancha del brazo.' },
    { id: 'muneca',      nombre: 'Muñeca',         grupo: 'Brazos',  min: 13,  max: 22,  paso: 0.5, ayuda: 'Contorno sobre el hueso de la muñeca.' },
    { id: 'entrepierna', nombre: 'Entrepierna',    grupo: 'Piernas', min: 62,  max: 96,  paso: 0.5, ayuda: 'De la entrepierna al suelo, por dentro de la pierna.' },
    { id: 'muslo',       nombre: 'Muslo',          grupo: 'Piernas', min: 40,  max: 80,  paso: 0.5, ayuda: 'Contorno en la parte más alta del muslo.' }
  ],

  // Cuerpos de partida. El de id 'promedio' es el inicial.
  presets: {
    h: [
      { id: 'delgado',  nombre: 'Esbelto',  v: { altura: 178, cuello: 37,   hombros: 44, pecho: 90,  cintura: 76,  cadera: 92,  brazo: 63,   biceps: 27, muneca: 16.5, entrepierna: 83, muslo: 50 } },
      { id: 'promedio', nombre: 'Promedio', v: { altura: 176, cuello: 39,   hombros: 46, pecho: 100, cintura: 86,  cadera: 100, brazo: 62,   biceps: 32, muneca: 17.5, entrepierna: 81, muslo: 56 } },
      { id: 'atletico', nombre: 'Atlético', v: { altura: 180, cuello: 41,   hombros: 49, pecho: 108, cintura: 82,  cadera: 100, brazo: 63.5, biceps: 37, muneca: 18,   entrepierna: 83, muslo: 60 } },
      { id: 'robusto',  nombre: 'Robusto',  v: { altura: 174, cuello: 43.5, hombros: 48, pecho: 118, cintura: 112, cadera: 114, brazo: 61,   biceps: 36, muneca: 19,   entrepierna: 78, muslo: 65 } }
    ],
    m: [
      { id: 'delgado',  nombre: 'Delgada',    v: { altura: 168, cuello: 32,   hombros: 37.5, pecho: 82,  cintura: 64, cadera: 89,  brazo: 57, biceps: 24,   muneca: 14.5, entrepierna: 79, muslo: 50 } },
      { id: 'promedio', nombre: 'Promedio',   v: { altura: 164, cuello: 33,   hombros: 39,   pecho: 92,  cintura: 72, cadera: 98,  brazo: 56, biceps: 27,   muneca: 15,   entrepierna: 76, muslo: 55 } },
      { id: 'atletico', nombre: 'Atlética',   v: { altura: 170, cuello: 33.5, hombros: 41,   pecho: 94,  cintura: 70, cadera: 98,  brazo: 58, biceps: 29.5, muneca: 15.5, entrepierna: 79, muslo: 57 } },
      { id: 'curvi',    nombre: 'Curvilínea', v: { altura: 162, cuello: 35,   hombros: 40,   pecho: 104, cintura: 80, cadera: 114, brazo: 55, biceps: 31,   muneca: 16,   entrepierna: 74, muslo: 64 } }
    ]
  },

  // Camisa de cuello italiano (cutaway / spread), abotonada.
  camisa: {
    colores: [
      { id: 'blanca',  nombre: 'Blanca',                  tela: '#ffffff', sombra: 'rgba(107,30,44,.10)', linea: '#6B1E2C', cuello: '#ffffff' },
      { id: 'celeste', nombre: 'Celeste',                 tela: '#d4e6fb', sombra: 'rgba(74,22,33,.16)', linea: '#4A1621', cuello: '#d4e6fb' },
      { id: 'rayas',   nombre: 'Rayas · cuello blanco', tela: 'rayas',   sombra: 'rgba(74,22,33,.12)', linea: '#4A1621', cuello: '#ffffff' }
    ],
    // Hombre: talla = cuello en cm (sistema italiano). Mujer: talla europea 34–46.
    tallas: { h: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46], m: [34, 36, 38, 40, 42, 44, 46] },
    // Holgura aceptable (prenda − cuerpo, en cm) por zona. Debajo = ajustado/corto; encima = holgado/largo.
    reglas: {
      cuello:  { h: [1, 3.5],    m: [0.5, 6] },
      hombros: { h: [-1.5, 2.5], m: [-1.5, 2.5] },
      pecho:   { h: [4, 24],     m: [3, 20] },
      cintura: { h: [2, 30],     m: [2, 26] },
      bajo:    { h: [2, 32],     m: [2, 24] },
      manga:   { h: [-0.5, 4],   m: [-0.5, 4] },
      largo:   { h: [-4, 16],    m: [-6, 10] }   // cm que el bajo queda por debajo de la entrepierna
    }
  }
};
