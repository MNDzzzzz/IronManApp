// ====================================================================
// PLAN OPERATIVO OFICIAL: TRANSICIÓN A MEDIA MARATÓN (21,097 KM)
// Atleta: Álvaro | Peso inicial: 101,0 kg | Meta 28-Feb: 85 - 88 kg
// Fecha objetivo: 28 de Febrero de 2027 (Media Maratón 21.097 km)
// Descansos fijos: Miércoles y Sábado
// ====================================================================

export interface DayRoutine {
  dayName: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  dayIndex: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  title: string;
  category: 'Fuerza' | 'Cardio' | 'Descanso';
  dayType: 'strength' | 'running' | 'rest_refeed';
  description: string;
  targetSteps: {
    min: number;
    max: number;
    note: string;
  };
  keyGoals: string[];
  workoutSummary: string[];
  warmup: {
    durationMinutes: number;
    description: string;
    exercises: string[];
  };
  stretches: {
    durationMinutes: number;
    description: string;
    exercises: string[];
  };
  nutritionStrategy: {
    calorieTarget: number;
    proteinTarget: string;
    carbsTarget: string;
    fatTarget: string;
    waterLiters: number;
    guidelines: string;
    recommendedMeals: {
      slot: string;
      dish: string;
      details: string;
    }[];
  };
  supplements: string[];
  halfMarathonImpact: string;
}

export interface HalfMarathonCountdown {
  targetDateStr: string;
  daysRemaining: number;
  weeksRemaining: number;
  extraDays: number;
  currentWeekNumber: number;
  currentPhase: string;
  phaseDescription: string;
  keyFocusToday: string;
}

export interface RunningWeekPlan {
  week: number;
  phase: string;
  phaseName: string;
  thursdaySession: string;
  thursdayKm: number;
  sundaySession: string;
  sundayKm: number;
  physiologicalGoal: string;
}

export const TARGET_HALF_MARATHON_DATE = '2027-02-28';
// Fecha de inicio de la preparación (22 semanas antes del 28 Feb 2027 = aprox 28 Sep 2026)
export const PLAN_START_DATE = '2026-09-21';

// --------------------------------------------------------------------
// 1. PERIODIZACIÓN COMPLETA DE CARRERA (22 SEMANAS DE 5K A 21K)
// --------------------------------------------------------------------
export const RUNNING_PERIODIZATION: Record<number, RunningWeekPlan> = {
  1: {
    week: 1,
    phase: 'Fase 1',
    phaseName: 'Blindaje Articular',
    thursdaySession: '4 km suaves (CaCo: 4 min trote @ 7:15-7:35 + 1 min andar ágil)',
    thursdayKm: 4.0,
    sundaySession: '5 km CaCo (4 min trote @ 7:20 + 1 min andar)',
    sundayKm: 5.0,
    physiologicalGoal: 'Cero dolor al despertar. Si el tendón rotuliano molesta, cambiar a 3 min trote / 1 min andar.',
  },
  2: {
    week: 2,
    phase: 'Fase 1',
    phaseName: 'Blindaje Articular',
    thursdaySession: '4 km suaves (CaCo: 4 min trote @ 7:15 + 1 min andar)',
    thursdayKm: 4.0,
    sundaySession: '5 km CaCo (4 min trote / 1 min andar). Mantener cadencia 165-172 ppm.',
    sundayKm: 5.0,
    physiologicalGoal: 'Asimilación del impacto de 101 kg. Apoyo riguroso debajo de la cadera.',
  },
  3: {
    week: 3,
    phase: 'Fase 1',
    phaseName: 'Blindaje Articular',
    thursdaySession: '4 km suaves (CaCo: 4 min trote + 1 min andar)',
    thursdayKm: 4.0,
    sundaySession: '6 km CaCo (4 min trote / 1 min andar)',
    sundayKm: 6.0,
    physiologicalGoal: 'Compactación tendinosa. Probar frío local 10 min post-carrera.',
  },
  4: {
    week: 4,
    phase: 'Fase 1',
    phaseName: 'Blindaje Articular',
    thursdaySession: '4 km suaves (CaCo: 4 min trote + 1 min andar)',
    thursdayKm: 4.0,
    sundaySession: '6 km CaCo (4 min trote / 1 min andar)',
    sundayKm: 6.0,
    physiologicalGoal: 'Confirmar desinflamación en tubérculo de Gerdy.',
  },
  5: {
    week: 5,
    phase: 'Fase 1',
    phaseName: 'Blindaje Articular',
    thursdaySession: '4.5 km suaves (CaCo: 4 min trote + 1 min andar)',
    thursdayKm: 4.5,
    sundaySession: '7 km CaCo (5 min trote / 1 min andar)',
    sundayKm: 7.0,
    physiologicalGoal: 'Fin de fase de blindaje. Tendones listos para carrera continua suave.',
  },
  6: {
    week: 6,
    phase: 'Fase 2',
    phaseName: 'Consolidación',
    thursdaySession: '5 km trote continuo suave en Zona 2 (7:15 - 7:30 min/km)',
    thursdayKm: 5.0,
    sundaySession: '8 km trote continuo suave (Zona 2 controlada)',
    sundayKm: 8.0,
    physiologicalGoal: 'Peso proyectado ~98-99 kg. Menos peso = menos tensión articular.',
  },
  7: {
    week: 7,
    phase: 'Fase 2',
    phaseName: 'Consolidación',
    thursdaySession: '5.5 km trote continuo suave',
    thursdayKm: 5.5,
    sundaySession: '9 km trote continuo suave en Z2',
    sundayKm: 9.0,
    physiologicalGoal: 'Capilarización muscular y eficiencia aeróbica con apoyo mediopié.',
  },
  8: {
    week: 8,
    phase: 'Fase 2',
    phaseName: 'Consolidación (Semana de Descarga)',
    thursdaySession: '5 km muy suaves regenerativos',
    thursdayKm: 5.0,
    sundaySession: '7 km trote suave (Descarga tendinosa programada)',
    sundayKm: 7.0,
    physiologicalGoal: 'Supercompensación. Permitir remodelación de colágeno sin estrés mecánico.',
  },
  9: {
    week: 9,
    phase: 'Fase 2',
    phaseName: 'Consolidación',
    thursdaySession: '6 km trote continuo suave',
    thursdayKm: 6.0,
    sundaySession: '10 km trote continuo en Zona 2',
    sundayKm: 10.0,
    physiologicalGoal: 'Primer test de 10 km. Hidratación con sales a mitad de sesión.',
  },
  10: {
    week: 10,
    phase: 'Fase 2',
    phaseName: 'Consolidación',
    thursdaySession: '6 km trote continuo suave',
    thursdayKm: 6.0,
    sundaySession: '11 km trote continuo en Zona 2',
    sundayKm: 11.0,
    physiologicalGoal: 'Peso proyectado ~95-96 kg. Rodillas significativamente más ligeras.',
  },
  11: {
    week: 11,
    phase: 'Fase 2',
    phaseName: 'Consolidación',
    thursdaySession: '6 km trote continuo suave',
    thursdayKm: 6.0,
    sundaySession: '12 km continuos en Zona 2',
    sundayKm: 12.0,
    physiologicalGoal: 'Transición completada a carrera continua de larga distancia.',
  },
  12: {
    week: 12,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '6.5 km a 7.5 km fáciles (terminando último km a 6:45 si no hay dolor)',
    thursdayKm: 7.0,
    sundaySession: '13 km en Zona 2 (Aclimatación estomacal: 1 gel al km 7 con agua)',
    sundayKm: 13.0,
    physiologicalGoal: 'Entrenamiento del sistema digestivo para absorber carbohidratos en carrera.',
  },
  13: {
    week: 13,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '7 km fáciles',
    thursdayKm: 7.0,
    sundaySession: '14 km en Zona 2 (Gel en el km 7-8 con agua abundante)',
    sundayKm: 14.0,
    physiologicalGoal: 'Depósitos de glucógeno y quema mitocondrial de ácidos grasos.',
  },
  14: {
    week: 14,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica (Descarga)',
    thursdaySession: '6 km fáciles',
    thursdayKm: 6.0,
    sundaySession: '11 km fáciles (Semana de descarga intermedia)',
    sundayKm: 11.0,
    physiologicalGoal: 'Descarga neuromuscular y absorción de la carga acumulada.',
  },
  15: {
    week: 15,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '7.5 km fáciles',
    thursdayKm: 7.5,
    sundaySession: '15 km en Zona 2 (Probar 2 geles: km 6 y km 11)',
    sundayKm: 15.0,
    physiologicalGoal: 'Protocolo nutricional de competición: geles cada 25-30 minutos.',
  },
  16: {
    week: 16,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '7.5 km fáciles con 4 cambios de ritmo suaves de 1 min',
    thursdayKm: 7.5,
    sundaySession: '16.5 km en Zona 2 (~1h 55m)',
    sundayKm: 16.5,
    physiologicalGoal: 'Eficiencia biomecánica en fatiga y mantenimiento de postura erguida.',
  },
  17: {
    week: 17,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '7.5 km fáciles',
    thursdayKm: 7.5,
    sundaySession: '17.5 km en Zona 2',
    sundayKm: 17.5,
    physiologicalGoal: 'Peso proyectado ~90-92 kg. Fortaleza del glúteo medio para evitar valgo dinámico.',
  },
  18: {
    week: 18,
    phase: 'Fase 3',
    phaseName: 'Resistencia Específica',
    thursdaySession: '7.5 km fáciles',
    thursdayKm: 7.5,
    sundaySession: '18.5 km en Zona 2 (Última tirada máxima de volumen)',
    sundayKm: 18.5,
    physiologicalGoal: 'Test de material definitivo (zapatillas, calcetines, geles, sales).',
  },
  19: {
    week: 19,
    phase: 'Fase 4',
    phaseName: 'Pico y Tapering',
    thursdaySession: '6 km muy fáciles + estiramientos completos',
    thursdayKm: 6.0,
    sundaySession: '17 km en Zona 2 controlada',
    sundayKm: 17.0,
    physiologicalGoal: 'Consolidación de la distancia con reducción gradual de volumen semanal.',
  },
  20: {
    week: 20,
    phase: 'Fase 4',
    phaseName: 'Pico y Tapering (Test Oficial)',
    thursdaySession: '6 km muy fáciles',
    thursdayKm: 6.0,
    sundaySession: '19 km (Test oficial de ritmo de Media Maratón: 14 km Z2 + 5 km a 6:45 min/km)',
    sundayKm: 19.0,
    physiologicalGoal: 'Ensayo general de ritmo competitivo y gestión de sensaciones.',
  },
  21: {
    week: 21,
    phase: 'Fase 4',
    phaseName: 'Tapering / Descarga Competitiva',
    thursdaySession: '5 km muy suaves con 3 aceleraciones de 50 metros',
    thursdayKm: 5.0,
    sundaySession: '13 km suaves en Zona 2 (Comienzo descarga profunda)',
    sundayKm: 13.0,
    physiologicalGoal: 'Reducir volumen un 35%, mantener tono neuromuscular y reparar microdaños.',
  },
  22: {
    week: 22,
    phase: 'Competición',
    phaseName: 'Semana de Carrera (28 Feb)',
    thursdaySession: 'Jueves 26: 3 km de activación suave (trote muy ligero + 3 aceleraciones cortas)',
    thursdayKm: 3.0,
    sundaySession: 'VIERNES 28 FEBRERO: MEDIA MARATÓN OFICIAL (21,097 KM) @ 6:40-6:55 min/km',
    sundayKm: 21.097,
    physiologicalGoal: 'Llegar al 100% articular. Peso diana 85-88 kg. Meta completada y rodillas sanas.',
  },
};

// --------------------------------------------------------------------
// 2. PROTOCOLO CLÍNICO DE REHABILITACIÓN DE RODILLAS & BIOMECÁNICA
// --------------------------------------------------------------------
export const KNEE_CLINICAL_PROTOCOLS = {
  tendon_cuadricipital: {
    title: 'Pinchazo por encima de la rótula (Izquierda)',
    structure: 'Tendón Cuadricipital',
    cause: 'Sobrecarga excéntrica por frenado repetitivo con 101 kg de peso corporal.',
    actions: [
      'Wall-sits (Sentadilla isométrica apoyado en pared a 60-70° de flexión): 4 series × 35-45 seg. Provoca analgesia y compresión tendinosa inmediata.',
      'Masaje de descarga con manos o Foam Roller en el vientre muscular del cuádriceps (¡sin tocar la rótula!).',
      'Aplicar frío local (hielo envuelto) durante 10 minutos tras correr.',
      'Si persiste molestia en carrera: cambiar de trote a bloques CaCo (3 min trote / 1 min andar).',
    ],
  },
  tuberculo_gerdy_perone: {
    title: 'Dolor en el hueso lateral externo bajo rótula (Bilateral)',
    structure: 'Tubérculo de Gerdy & Cabeza del Peroné',
    cause: 'Inserción de la cintilla iliotibial / bíceps femoral sometida a tracción por rotación interna.',
    actions: [
      'Liberar con pelota de lacrosse/tenis o rodillo el TENSOR DE LA FASCIA LATA (muslo lateral alto y glúteo).',
      '¡REGLA DE ORO INMUTABLE! Jamás masajear directamente sobre el hueso inflamado.',
      'Fortalecer glúteo medio (abducción con banda y clamshell) para que la rodilla no colapse hacia adentro en el apoyo.',
      'Aumentar cadencia a 165-172 ppm para reducir la flexión y tracción de la cintilla en cada zancada.',
    ],
  },
  higiene_post_carrera: {
    title: 'Higiene Post-Carrera (Fascia y Cadena Posterior)',
    structure: 'Fascia Plantar, Sóleo y Gemelos',
    cause: 'Impacto y tensión de la cadena cinética inferior.',
    actions: [
      'Pelota de tenis o golf bajo la planta del pie: 2 minutos por lado con presión moderada.',
      'Estiramiento suave de gemelos y sóleo contra pared (talón en suelo, rodilla estirada 40s y luego flexionada 40s).',
      'Elevación de piernas en pared (Viparita Karani) 10 minutos para drenaje venoso.',
    ],
  },
  running_technique: {
    title: 'Ajustes Clave de Técnica de Carrera',
    rules: [
      'Cadencia alta (165 - 172 pasos por minuto): Da pasos más cortos y más rápidos. Menor tiempo de contacto con el suelo.',
      'Apoyo debajo del centro de gravedad: Pisa siempre "debajo de tu cadera", nunca con el talón adelantado frenando contra el asfalto.',
      'Cuerpo ligeramente inclinado hacia adelante desde los tobillos, mirada 15-20 metros al frente y hombros relajados.',
    ],
  },
};

// --------------------------------------------------------------------
// 3. MENÚ DIARIO ESTRUCTURADO DE 2.400 KCAL (CIENTÍFICO)
// --------------------------------------------------------------------
export const STRUCTURED_MENU_2400 = {
  calories: 2400,
  proteinGrams: 202,
  carbsGrams: 230,
  fatGrams: 75,
  waterLiters: 3.8, // 3.5 a 4.0 L
  meals: [
    {
      slot: 'Desayuno (08:00)',
      name: 'Proteína y Energía',
      macros: '38g P | 60g HC | 21g G | ~580 kcal',
      foodItems: [
        '3 huevos enteros revueltos + 2 claras adicionales.',
        '70 g de copos de avena con canela (o 3 rebanadas de pan 100% integral).',
        '1 plátano mediano.',
        '1 café solo (~150 mg de cafeína).',
      ],
      timingNote: 'Energía sostenida y aminoácidos para arrancar el día.',
    },
    {
      slot: 'Almuerzo (13:30)',
      name: 'Comida Principal',
      macros: '60g P | 68g HC | 17g G | ~670 kcal',
      foodItems: [
        '220 g de pechuga de pollo, pavo o ternera magra.',
        '220 g de arroz blanco cocido (o 280 g de patata/boniato asado).',
        'Ensalada abundante variada + 12 g de aceite de oliva virgen extra.',
      ],
      timingNote: 'Carga principal de carbohidratos complejos para reponer glucógeno.',
    },
    {
      slot: 'Merienda (17:30)',
      name: 'Pre/Post Entreno',
      macros: '54g P | 40g HC | 15g G | ~510 kcal',
      foodItems: [
        '300 g de queso fresco batido 0% (o yogur proteico).',
        '1 manzana grande + 30 g de proteína en polvo (Impact Whey o aislado).',
        '20 g de nueces o almendras tostadas sin sal.',
        '+ 5 g de creatina monohidrato en agua.',
      ],
      timingNote: 'Proteína rápida, saciedad y creatina para saturación muscular.',
    },
    {
      slot: 'Cena (21:00)',
      name: 'Reparación Nocturna',
      macros: '50g P | 35g HC | 22g G | ~540 kcal',
      foodItems: [
        '220 g de salmón, merluza o atún fresco a la plancha.',
        'Plato grande de verduras al vapor (brócoli, judías verdes, zanahorias).',
        '180 g de patata al vapor + 10 g de aceite de oliva virgen extra.',
      ],
      timingNote: 'Omega-3 de origen marino, micronutrientes antiinflamatorios y descanso reparador.',
    },
  ],
  supplements: [
    'Creatina monohidrato: 5 g diarios con agua (retiene masa muscular y fuerza en déficit).',
    'Omega-3: 2 g EPA/DHA diarios (reduce activamente la inflamación en el tubérculo de Gerdy y tendón rotuliano).',
    'Colágeno hidrolizado + Vitamina C: Tomar 30-45 minutos antes de salir a rodar o de entrenar pierna.',
    'Cafeína pre-entreno: 150 a 250 mg 45 minutos antes de correr (disminuye la percepción de esfuerzo).',
  ],
};

// --------------------------------------------------------------------
// 4. DISTRIBUCIÓN SEMANAL FIJA (MICROCICLO DE 7 DÍAS)
// --------------------------------------------------------------------
export const WEEKLY_ROUTINE: Record<number, DayRoutine> = {
  // 1: LUNES - FUERZA TORSO (EMPUJE + TIRÓN)
  1: {
    dayName: 'Lunes',
    dayIndex: 1,
    title: 'Fuerza Torso (Empuje + Tirón)',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Empuje y tracción para hipertrofia de torso, estabilidad escapular y postura torácica erguida al correr. Cero estrés en rodilla.',
    targetSteps: {
      min: 10000,
      max: 11500,
      note: 'Mantén tu rutina activa habitual sin sobrepasar para no acumular fatiga innecesaria.',
    },
    keyGoals: [
      'Fortalecer pectoral, dorsal, deltoides y brazos.',
      'Mejorar la estabilidad escapulohumeral (Face pulls) para no colapsar hombros en carrera.',
      'Cero impacto en rodillas tras la tirada larga del domingo.',
    ],
    workoutSummary: [
      'Press de banca con mancuernas: 4 series × 8-10 reps (pesado, tempo controlado)',
      'Remo en polea baja o con barra: 4 series × 8-10 reps',
      'Press militar con mancuernas: 3 series × 10 reps',
      'Jalón al pecho agarre neutro: 3 series × 10-12 reps',
      'Face pulls en polea: 3 series × 15 reps (estabilidad escapular)',
      'Bíceps con mancuerna + Tríceps en cuerda: 3 series × 12 reps',
    ],
    warmup: {
      durationMinutes: 8,
      description: 'Movilidad articular de hombros, cintura escapular y muñecas + series de aproximación.',
      exercises: [
        'Círculos de brazos adelante y atrás (20 reps)',
        'Dislocaciones de hombro con banda elástica o pica (12 reps)',
        'Rotaciones externas e internas con banda elástica (15 reps/lado)',
        'Cat-Cow torácico y aperturas escapulares en suelo (10 reps)',
        '2 series de aproximación con peso ligero en Press de banca',
      ],
    },
    stretches: {
      durationMinutes: 8,
      description: 'Descarga estática suave de pectoral, dorsal ancho y musculatura del cuello.',
      exercises: [
        'Estiramiento de pectoral en pared o marco (30s por lado)',
        'Estiramiento de dorsal ancho colgado de barra o con apoyo (35s)',
        'Estiramiento de tríceps tras nuca (30s por brazo)',
        'Estiramiento de deltoides posterior cruzando el brazo (30s/brazo)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230 g',
      fatTarget: '75 g',
      waterLiters: 3.8,
      guidelines:
        'Día de fuerza de torso. Repartir la proteína en 4 tomas de 40-60g. Agua abundante (3.5 - 4.0 L) para reponer fluidos intracelulares.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas integrales + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g pechuga pollo/pavo con 220g arroz cocido + ensalada con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g nueces + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g salmón o merluza + verduras vapor + 180g patata vapor con AOVE',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: ['Creatina 5g con la merienda', 'Omega-3 2g con la cena'],
    halfMarathonImpact:
      'Un torso fuerte evita la flexión del tronco y la caída de hombros a partir del km 14 de la Media Maratón, manteniendo abierta la caja torácica para respirar con menor esfuerzo.',
  },

  // 2: MARTES - FUERZA PIERNA BLINDADA (ANTI-IMPACTO) + CORE
  2: {
    dayName: 'Martes',
    dayIndex: 2,
    title: 'Fuerza Pierna Blindada (Anti-Impacto) + Core',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Isométricos de cuádriceps, glúteo medio, tibial y gemelos. Blindaje articular estricto para eliminar tensión en rótula y cabeza de peroné.',
    targetSteps: {
      min: 10000,
      max: 11000,
      note: 'Mantén los pasos controlados. Las piernas deben descansar de impacto deportivo.',
    },
    keyGoals: [
      'Wall-sits isométricos para generar analgesia y compactar el tendón cuadricipital.',
      'Fortalecer el glúteo medio (abducción con banda) para eliminar la tensión de la cintilla iliotibial.',
      'Trabajo excéntrico de sóleo y gemelos (3s) para actuar de amortiguadores naturales.',
      'Refuerzo de flexión dorsal (tibial anterior) para mejorar la mecánica de pisada.',
    ],
    workoutSummary: [
      'Sentadilla isométrica contra la pared (Wall-sits): 4 series × 35-45 seg (anestesia tendón cuadricipital a 60-70°)',
      'Abducción de cadera con banda (Glúteo medio): 4 series × 15 reps (clave: quita tensión de la cintilla iliotibial)',
      'Puente de glúteos unilateral: 3 series × 10 reps por pierna',
      'Elevación de talones de pie (sóleo/gemelo): 4 series × 15 reps (3 seg de bajada excéntrica lenta)',
      'Flexión dorsal de tobillo con resistencia (tibial anterior): 3 series × 15 reps',
      'Plancha frontal y lateral: 3 series × 30-40 segundos',
    ],
    warmup: {
      durationMinutes: 8,
      description: 'Activación articular de tobillos, apertura de cadera y activación de glúteo.',
      exercises: [
        'Dorsiflexión de tobillo contra pared (15 reps por pierna)',
        'Puente de glúteos bipodal con banda elástica (15 reps)',
        'Rotaciones de cadera 90/90 en suelo (10 reps alternadas)',
        'Sentadilla isométrica suave sin peso apoyado en pared (20 seg)',
      ],
    },
    stretches: {
      durationMinutes: 10,
      description: 'Liberación miofascial y descompresión de cadena inferior.',
      exercises: [
        'Liberar con pelota de tenis el Tensor de la Fascia Lata (muslo lateral alto y glúteo) - ¡No tocar el hueso!',
        'Estiramiento de cuádriceps de pie con pelvis neutra (40s por pierna)',
        'Estiramiento de sóleo y tendón de Aquiles en pared (45s por pierna)',
        'Masaje con pelota bajo la planta del pie (2 min por lado)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230 g',
      fatTarget: '75 g',
      waterLiters: 3.8,
      guidelines:
        'Día clave de remodelación articular. Colágeno hidrolizado + Vitamina C tomado 30-45 min antes de la sesión para nutrir los tendones.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas integrales + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g pechuga pollo/pavo con 280g patata/boniato asado + ensalada variada con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g nueces + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g pescado blanco (merluza o bacalao) + verduras al vapor + 180g patata al vapor',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: [
      'Colágeno Hidrolizado + Vitamina C (30-45 min antes del entreno de pierna)',
      'Creatina 5g con la merienda',
      'Omega-3 2g con la cena',
    ],
    halfMarathonImpact:
      'Tener cuádriceps, glúteos medios y sóleos blindados absorbe el 70% del impacto de cada zancada. Es la vacuna definitiva contra el dolor en el tubérculo de Gerdy y la tendinitis cuadricipital.',
  },

  // 3: MIÉRCOLES - DESCANSO TOTAL (REGENERACIÓN PROFUNDA)
  3: {
    dayName: 'Miércoles',
    dayIndex: 3,
    title: 'Descanso Total (Regeneración y Descompresión Tendinosa)',
    category: 'Descanso',
    dayType: 'rest_refeed',
    description:
      'Cero impacto deportivo. Regeneración neuromuscular y desinflamación tendinosa para llegar fresco y sin dolor al rodaje del jueves.',
    targetSteps: {
      min: 8000,
      max: 9000,
      note: '¡ALERTA CLÍNICA! Intenta recortar pasos innecesarios (bajar a 8.000-9.000) para permitir que los tendones de la rodilla se desinflamen por completo.',
    },
    keyGoals: [
      'Recortar pasos para permitir el drenaje metabólico del tubérculo de Gerdy.',
      'Cero entrenamientos anaeróbicos ni carreras.',
      'Descompresión de columna y drenaje venoso.',
    ],
    workoutSummary: [
      'DESCANSO TOTAL Y ABSOLUTO.',
      'Sesión opcional de 10 min de movilidad y descompresión (Dead Hang en barra y Viparita Karani en pared).',
      'Caminar relajado solo lo indispensable.',
    ],
    warmup: {
      durationMinutes: 0,
      description: 'Día de descanso pasivo. Sin calentamiento.',
      exercises: [],
    },
    stretches: {
      durationMinutes: 10,
      description: 'Descompresión espinal y retorno venoso.',
      exercises: [
        'Descompresión colgado de barra (Dead Hang) 3 series de 30s',
        'Piernas elevadas contra la pared (Viparita Karani) 10 minutos para drenaje venoso de rodillas',
        'Respiración diafragmática profunda',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230 g',
      fatTarget: '75 g',
      waterLiters: 3.8,
      guidelines:
        'Mantener las 2.400 kcal estables con 202g de proteína para que los aminoácidos reconstruyan el tejido conectivo de las rodillas sin entrar en catabolismo.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas integrales + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g pollo o ternera magra con 220g arroz cocido + ensalada con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g almendras + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g atún o salmón fresco + verduras vapor + 180g patata al vapor',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: ['Creatina 5g con la merienda', 'Omega-3 2g con la cena'],
    halfMarathonImpact:
      'El descanso no es opcional: es donde el tendón se reconstruye y se adapta. Sin el descanso del miércoles, el rodaje del jueves reabriría la inflamación.',
  },

  // 4: JUEVES - CARRERA: RODAJE BASE (VOLUMEN SUAVE & CACO)
  4: {
    dayName: 'Jueves',
    dayIndex: 4,
    title: 'Carrera: Rodaje Base (Volumen Suave & CaCo)',
    category: 'Cardio',
    dayType: 'running',
    description:
      'Volumen suave controlado a ritmo >7:15 min/km (método CaCo si hay molestia o según fase). Foco en cadencia (165-172 ppm) y apoyo bajo cadera.',
    targetSteps: {
      min: 12000,
      max: 14000,
      note: 'Subirás de forma natural sumando el entrenamiento. Camina por superficies blandas o llanas.',
    },
    keyGoals: [
      'Rodar estrictamente entre 7:15 y 7:35 min/km (no correr a 6:52 para proteger tendones).',
      'Cadencia rápida de pasos cortos (~165-172 ppm).',
      'Apoyo debajo del centro de gravedad (cero talonamiento).',
    ],
    workoutSummary: [
      'Fase actual de carrera: Consultar prescripción semanal con /caco.',
      'Bloques CaCo según fase (Sem 1-5: 4 km alternando 4 min trote cómodo @ 7:15 + 1 min andar ágil).',
      'Cero dolor al terminar. Si molesta la rótula, pasar inmediatamente a 3 min trote / 1 min andar.',
    ],
    warmup: {
      durationMinutes: 8,
      description: 'Activación dinámica de tobillo, gemelos y cadera antes de salir al asfalto.',
      exercises: [
        'Círculos de tobillos y rotaciones suaves de rodillas (15 reps/lado)',
        'Leg swings frontales y laterales suaves (10 reps/lado)',
        'Caminar rápido y ágil durante 3 minutos antes de iniciar el primer trote',
      ],
    },
    stretches: {
      durationMinutes: 10,
      description: 'Higiene post-carrera estricta: planta del pie, gemelos y sóleo.',
      exercises: [
        'Pelota de tenis bajo la planta del pie: 2 minutos por lado',
        'Estiramiento suave de gemelos contra pared con talón en suelo (40s por pierna)',
        'Estiramiento de sóleo con rodilla flexionada (40s por pierna)',
        'Frío local 10 minutos si hubo sensación de calor o carga sobre la rótula',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230 g',
      fatTarget: '75 g',
      waterLiters: 3.8,
      guidelines:
        'Hidratación de 3.5 a 4.0 L. Cafeína 150-250mg (café solo) 45 min antes de salir a correr para reducir la percepción de esfuerzo.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g pechuga pavo/pollo con 220g arroz cocido + ensalada abundante con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Pre-Carrera (45 min antes)',
          dish: 'Café solo (~150-200 mg cafeína) + vaso de agua grande + Colágeno hidrolizado',
          details: 'Estimulación del SNC y disponibilidad de aminoácidos para tendones.',
        },
        {
          slot: 'Cena Post-Carrera',
          dish: '220g salmón o merluza a la plancha + verduras al vapor + 180g patata cocida con AOVE',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: [
      'Colágeno Hidrolizado + Vitamina C (30-45 min antes de salir a rodar)',
      'Cafeína 150-250 mg 45 min antes de correr',
      'Creatina 5g en la merienda',
      'Omega-3 2g en la cena',
    ],
    halfMarathonImpact:
      'El rodaje suave del jueves enseña al corazón a bombear más volumen por latido (adaptación excéntrica del ventrículo izquierdo) sin fatigar las articulaciones.',
  },

  // 5: VIERNES - FUERZA FUNCIONAL + CARDIO DE DESCARGA
  5: {
    dayName: 'Viernes',
    dayIndex: 5,
    title: 'Fuerza Funcional + Cardio de Descarga',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Fuerza general funcional con foco en cadena posterior (sin sobrecargar rótula) + 20 min de bicicleta estática regenerativa con sillín alto.',
    targetSteps: {
      min: 10000,
      max: 11500,
      note: 'Mantén la rutina activa estándar.',
    },
    keyGoals: [
      'Peso muerto rumano para blindar isquios y glúteos sin doblar en exceso la rodilla.',
      'Clamshell con banda elástica para activar glúteo medio.',
      'Paseo del granjero para estabilidad lumbo-pélvica y fuerza de agarre.',
      '20 min de bicicleta estática con sillín alto y muy suave para oxigenar rodillas sin golpear.',
    ],
    workoutSummary: [
      'Peso muerto rumano con mancuernas: 3 series × 10 reps (foco en cadena posterior sin sobrecargar rótula)',
      'Clamshell con banda elástica: 3 series × 15 reps por lado',
      'Press de pecho inclinado o flexiones: 3 series × 10-12 reps',
      'Remo unilateral con mancuerna: 3 series × 10 reps por lado',
      'Paseo del granjero: 3 rondas × 40 pasos con carga media',
      'Cardio regenerativo: 20 min de bicicleta estática con resistencia muy suave y sillín alto (oxigena las rodillas sin golpear)',
    ],
    warmup: {
      durationMinutes: 8,
      description: 'Activación articular de cadera, escápulas y glúteos.',
      exercises: [
        'Puente de glúteos en suelo con banda elástica (15 reps)',
        'Clamshell suave sin banda para activación neuromuscular (10 reps/lado)',
        'Bisagra de cadera contra pared (12 reps)',
        'Plancha frontal activa (35 seg)',
      ],
    },
    stretches: {
      durationMinutes: 8,
      description: 'Descarga de isquiosurales, glúteos y lumbares tras la sesión de fuerza.',
      exercises: [
        'Estiramiento piramidal y glúteo medio sentado en banco (45s por lado)',
        'Child’s pose con brazos estirados al frente (1 minuto)',
        'Estiramiento de pectoral en pared (30s por lado)',
        'Estiramiento de flexor de cadera en zancada baja (40s por lado)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230 g',
      fatTarget: '75 g',
      waterLiters: 3.8,
      guidelines:
        'Completar las 4 tomas sólidas. Buen aporte de carbohidratos en comida y merienda para afrontar la fuerza y la bici estática.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g carne magra de ternera o pollo con 280g patata asada + ensalada con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g nueces + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g atún fresco o salmón + verduras al vapor + 180g patata al vapor',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: ['Creatina 5g con la merienda', 'Omega-3 2g con la cena'],
    halfMarathonImpact:
      'La bicicleta estática con sillín alto hace circular líquido sinovial por la articulación de la rodilla, actuando como un bálsamo reparador antes de la tirada larga dominical.',
  },

  // 6: SÁBADO - DESCANSO TOTAL 100% & CARGA PRE-TIRADA
  6: {
    dayName: 'Sábado',
    dayIndex: 6,
    title: 'Descanso Total 100% & Carga Pre-Tirada (Carb Loading)',
    category: 'Descanso',
    dayType: 'rest_refeed',
    description:
      'Desconexión absoluta. Reposo pasivo total y carga óptima de glucógeno para llenar los tanques de cara a la tirada larga del domingo.',
    targetSteps: {
      min: 8000,
      max: 10000,
      note: 'Recorta pasos innecesarios. Piernas en alto y relajación máxima.',
    },
    keyGoals: [
      'Reposo total de tendones e inserciones musculares.',
      'Saturar los depósitos de glucógeno hepático y muscular.',
      'Hidratación óptima (3.5 - 4.0 L) con pizca de sales para retener líquidos intracelulares.',
      'Dormir 8 horas para facilitar la supercompensación.',
    ],
    workoutSummary: [
      'CERO ENTRENAMIENTOS.',
      'Reposo deportivo absoluto.',
      'Estiramientos suaves de cuello y espalda si apetece, pero cero impacto de piernas.',
    ],
    warmup: {
      durationMinutes: 0,
      description: 'Día de descanso total. Cero calentamiento.',
      exercises: [],
    },
    stretches: {
      durationMinutes: 8,
      description: 'Movilidad suave de relajación.',
      exercises: [
        'Postura del niño (Child’s pose) 2 minutos',
        'Piernas elevadas en pared 10 minutos',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230–250 g',
      fatTarget: '70–75 g',
      waterLiters: 3.8,
      guidelines:
        'Carga limpia de carbohidratos complejos (arroz, patatas cocidas, avena, fruta) sin subir las grasas. No saltarse el agua.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: '3 huevos revueltos + 2 claras + 70g copos de avena con canela + plátano y café',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Almuerzo',
          dish: '220g pechuga de pollo o ternera magra con 220g arroz cocido + ensalada con AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana grande + 30g whey + 20g almendras + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g merluza o salmón + 200g patatas al vapor + verduras al vapor',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: ['Creatina 5g con la merienda', 'Omega-3 2g con la cena'],
    halfMarathonImpact:
      'El descanso del sábado es lo que hace posible completar la tirada larga del domingo con energía abundante, sin calambres y con las rodillas 100% listas.',
  },

  // 0: DOMINGO - TIRADA LARGA SEMANAL (LA SESIÓN REINA)
  0: {
    dayName: 'Domingo',
    dayIndex: 0,
    title: 'Tirada Larga Semanal (Sesión Reina CaCo / Progresiva)',
    category: 'Cardio',
    dayType: 'running',
    description:
      'LA SESIÓN REINA. Volumen progresivo con gestión de impacto para evitar picos de dolor lateral. Método CaCo en Fase 1 y transición a Zona 2 continua.',
    targetSteps: {
      min: 13000,
      max: 16000,
      note: 'Subirás naturalmente sumando los km de la tirada. Evita terreno con desniveles pronunciados.',
    },
    keyGoals: [
      'Construir fondo aeróbico y densidad capilar.',
      'Control estricto de ritmo: 7:15 - 7:35 min/km en Zona 2.',
      'Cadencia mantenida a 165-172 ppm para reducir la carga de impacto.',
      'Testear hidratación en ruta y geles a partir de tiradas de más de 75 minutos.',
    ],
    workoutSummary: [
      'Fase actual de carrera: Consultar prescripción semanal con /caco.',
      'Tirada larga programada según semana (Sem 1-2: 5 km; Sem 3-4: 6 km; Sem 5: 7 km CaCo; progresando hasta 18.5 km en semanas avanzadas).',
      'Progresión con gestión de impacto: Si hay molestia en la inserción lateral de la rodilla, pasar a bloques de andar 1 min cada 4 min.',
    ],
    warmup: {
      durationMinutes: 10,
      description: 'Activación articular completa de tobillos, rodillas y cadera antes de salir.',
      exercises: [
        'Círculos de tobillos y balanceos suaves de rodilla (15 reps/lado)',
        'Leg swings frontales y laterales suaves (10 reps/lado)',
        'Caminar rápido durante 3 minutos antes de iniciar el primer trote suave',
      ],
    },
    stretches: {
      durationMinutes: 12,
      description: 'Protocolo de descarga post-tirada larga: higiene fascial y frío local.',
      exercises: [
        'Caminar 5 minutos para retorno venoso gradual y bajada paulatina de pulsaciones',
        'Pelota de tenis bajo la planta del pie: 2 minutos por lado (fascia plantar)',
        'Estiramiento de sóleo y tendón de Aquiles en escalón o pared (50s por pierna)',
        'Estiramiento de gemelos en pared (50s por pierna)',
        'Liberar con pelota el Tensor de la Fascia Lata (muslo lateral alto y glúteo) - ¡No masajear el hueso inflamado!',
        'Aplicar frío local 10 minutos en tendón rotuliano si hay sensación de calor',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '202 g (2 g/kg)',
      carbsTarget: '230–250 g',
      fatTarget: '70–75 g',
      waterLiters: 3.8,
      guidelines:
        'Desayuno rico en carbohidratos 90-120 min antes. Cafeína 150-250mg y Colágeno hidrolizado 45 min antes. Rehidratación inmediata post-carrera con agua y sales.',
      recommendedMeals: [
        {
          slot: 'Desayuno Pre-Tirada (90-120 min antes)',
          dish: '3 huevos revueltos + 2 claras + 70g avena/3 tostadas + plátano y café solo',
          details: '580 kcal | 38g P, 60g HC, 21g G.',
        },
        {
          slot: 'Pre-Carrera (45 min antes)',
          dish: 'Café solo (~150-200 mg cafeína) + Colágeno hidrolizado con Vit C + vaso de agua',
          details: 'Activación del sistema nervioso y protección de tendones.',
        },
        {
          slot: 'Almuerzo Post-Tirada (La Celebración)',
          dish: '220g pechuga pollo/ternera magra con 220g arroz cocido + ensalada con 12g AOVE',
          details: '670 kcal | 60g P, 68g HC, 17g G. Reposición completa de glucógeno.',
        },
        {
          slot: 'Merienda',
          dish: '300g queso fresco batido 0% + 1 manzana + 30g whey + 20g almendras + 5g creatina',
          details: '510 kcal | 54g P, 40g HC, 15g G.',
        },
        {
          slot: 'Cena',
          dish: '220g salmón fresco a la plancha + verduras al vapor + 180g patata al vapor',
          details: '540 kcal | 50g P, 35g HC, 22g G.',
        },
      ],
    },
    supplements: [
      'Colágeno Hidrolizado + Vitamina C (30-45 min antes de salir a rodar)',
      'Cafeína 150-250 mg 45 min antes de correr',
      'Creatina 5g en la merienda',
      'Omega-3 2g en la cena',
    ],
    halfMarathonImpact:
      'Esta es la sesión que forja al corredor de Media Maratón. Cada domingo sumas adaptaciones mitocondriales y capilares directas hacia la meta del 28 de febrero.',
  },
};

// --------------------------------------------------------------------
// 5. FUNCIONES HELPER & MATEMÁTICA DE CALENDARIO
// --------------------------------------------------------------------

/**
 * Obtiene la fecha actual ajustada a la zona horaria peninsular española (Europe/Madrid)
 */
export function getSpainDate(inputDate?: Date | string): Date {
  const d = inputDate ? new Date(inputDate) : new Date();
  const spainStr = d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' });
  return new Date(spainStr);
}

/**
 * Obtener la rutina correspondiente al día de hoy o fecha especificada
 */
export function getTodayRoutine(date?: Date | string): DayRoutine {
  const spainDate = getSpainDate(date);
  const dayIndex = spainDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return WEEKLY_ROUTINE[dayIndex] || WEEKLY_ROUTINE[1];
}

/**
 * Calcula el número de semana actual del plan (Semana 1 a 22)
 */
export function getCurrentWeekNumber(currentDate?: Date | string): number {
  const now = getSpainDate(currentDate);
  const start = new Date(`${PLAN_START_DATE}T00:00:00+01:00`);
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.min(22, Math.max(1, weekNum));
}

/**
 * Obtiene la prescripción de carrera para la semana actual
 */
export function getRunningProgressionForWeek(weekNum?: number): RunningWeekPlan {
  const currentWeek = weekNum || getCurrentWeekNumber();
  return RUNNING_PERIODIZATION[currentWeek] || RUNNING_PERIODIZATION[1];
}

/**
 * Calcula la cuenta atrás y fase de preparación para la Media Maratón del 28 de febrero de 2027
 */
export function getHalfMarathonCountdown(currentDate?: Date | string): HalfMarathonCountdown {
  const now = getSpainDate(currentDate);
  const target = new Date(`${TARGET_HALF_MARATHON_DATE}T09:00:00+01:00`);
  const diffMs = target.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.floor(daysRemaining / 7);
  const extraDays = daysRemaining % 7;
  const currentWeekNumber = getCurrentWeekNumber(currentDate);
  const runningPlan = getRunningProgressionForWeek(currentWeekNumber);

  let keyFocusToday =
    'Mantener el pulso en Zona 2 (7:15-7:35 min/km), respetar la cadencia de 165-172 ppm y no forzar si hay pinchazo.';

  if (currentWeekNumber <= 5) {
    keyFocusToday =
      'Fase de Blindaje: Método CaCo (correr/caminar) y Wall-sits para desinflamar tendón cuadricipital y peroné.';
  } else if (currentWeekNumber <= 11) {
    keyFocusToday =
      'Fase de Consolidación: Carrera continua en Zona 2 y bajada gradual de peso hacia ~94-96 kg.';
  } else if (currentWeekNumber <= 18) {
    keyFocusToday =
      'Fase de Resistencia: Tiradas de 13 a 18.5 km y entrenamiento de absorción de geles e hidratación en ruta.';
  } else if (currentWeekNumber <= 21) {
    keyFocusToday =
      'Fase de Tapering: Reducir volumen, mantener velocidad y llegar con articulaciones al 100% sin dolor.';
  } else {
    keyFocusToday =
      'Semana de Competición: Descanso, visualización, activación suave y volar a 6:40-6:55 min/km el 28 de febrero.';
  }

  return {
    targetDateStr: '28 de Febrero de 2027',
    daysRemaining,
    weeksRemaining,
    extraDays,
    currentWeekNumber,
    currentPhase: `${runningPlan.phase}: ${runningPlan.phaseName} (Semana ${currentWeekNumber} de 22)`,
    phaseDescription: runningPlan.physiologicalGoal,
    keyFocusToday,
  };
}

/**
 * Formatea el reporte completo del día para el bot de Telegram
 */
export function formatDailyScheduleMarkdown(date?: Date | string): string {
  const routine = getTodayRoutine(date);
  const countdown = getHalfMarathonCountdown(date);
  const runningPlan = getRunningProgressionForWeek(countdown.currentWeekNumber);
  const todayDateStr = getSpainDate(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return `
📅 *HOY ES ${routine.dayName.toUpperCase()} (${todayDateStr})*
🎯 *Sesión:* *${routine.title}*
🏷️ *Categoría:* ${routine.category} | *Tipo:* ${routine.dayType.toUpperCase()}
👟 *Objetivo de Pasos:* *${routine.targetSteps.min.toLocaleString()} – ${routine.targetSteps.max.toLocaleString()} pasos*
💡 _${routine.targetSteps.note}_

📝 *Objetivo de la Sesión:*
_${routine.description}_

🏋️‍♂️ *Plan de Trabajo:*
${routine.workoutSummary.map((item) => `• ${item}`).join('\n')}

🔥 *Calentamiento Sugerido (${routine.warmup.durationMinutes} min):*
_${routine.warmup.description}_
${routine.warmup.exercises.length > 0 ? routine.warmup.exercises.map((e) => `  └ ${e}`).join('\n') : '  └ _Día de descanso: sin calentamiento necesario._'}

🧘‍♂️ *Estiramientos & Higiene Articular (${routine.stretches.durationMinutes} min):*
_${routine.stretches.description}_
${routine.stretches.exercises.map((e) => `  └ ${e}`).join('\n')}

🥗 *Estrategia Nutricional Oficial (2.400 kcal):*
• Calorías objetivo: *${routine.nutritionStrategy.calorieTarget} kcal*
• Proteína (2 g/kg): *${routine.nutritionStrategy.proteinTarget}*
• Carbohidratos: *${routine.nutritionStrategy.carbsTarget}*
• Grasas saludables: *${routine.nutritionStrategy.fatTarget}*
• Agua: *${routine.nutritionStrategy.waterLiters} L* (Lubricación articular y NEAT alto)
💊 *Suplementos recomendados:* ${routine.supplements.join(' | ')}

🍽️ *Menú Estructurado de Hoy:*
${routine.nutritionStrategy.recommendedMeals.map((m) => `• *${m.slot}:* ${m.dish}\n  └ _${m.details}_`).join('\n\n')}

🏁 *Rumbo a la Media Maratón (28/02/2027):*
⏳ Quedan *${countdown.daysRemaining} días* (*${countdown.weeksRemaining} semanas y ${countdown.extraDays} días*)
📍 *${countdown.currentPhase}*
🎯 *Prescripción esta semana:* Jueves: _${runningPlan.thursdaySession}_ | Domingo: _${runningPlan.sundaySession}_
💡 _${routine.halfMarathonImpact}_
`.trim();
}

/**
 * Formatea la semana completa de lunes a domingo
 */
export function formatWeeklyScheduleMarkdown(): string {
  const days = [1, 2, 3, 4, 5, 6, 0];
  let res = `🗓️ *MICROCICLO SEMANAL FIJO — ÁLVARO (101 KG -> 85-88 KG)*\n\n`;

  for (const d of days) {
    const r = WEEKLY_ROUTINE[d];
    res += `*${r.dayName.toUpperCase()}:* *${r.title}*\n`;
    res += `  └ 🎯 ${r.description}\n`;
    res += `  └ 👟 Pasos: *${r.targetSteps.min.toLocaleString()} – ${r.targetSteps.max.toLocaleString()}* | 🥗 *${r.nutritionStrategy.calorieTarget} kcal*\n\n`;
  }

  res += `🏁 *Meta Oficial:* Media Maratón el *28 de Febrero de 2027* (21,097 km).\n`;
  res += `⚠️ *Regla Clínica de Oro:* Los descansos del miércoles y sábado deben respetarse para que los tendones de la rodilla se desinflamen.`;
  return res.trim();
}

/**
 * Formatea el protocolo clínico de rodillas y rehabilitación
 */
export function formatKneeRehabMarkdown(): string {
  const t = KNEE_CLINICAL_PROTOCOLS.tendon_cuadricipital;
  const g = KNEE_CLINICAL_PROTOCOLS.tuberculo_gerdy_perone;
  const h = KNEE_CLINICAL_PROTOCOLS.higiene_post_carrera;
  const tech = KNEE_CLINICAL_PROTOCOLS.running_technique;

  return `
🏥 *PROTOCOLO CLÍNICO & REHABILITACIÓN DE RODILLAS (101 KG)*

⚠️ *Alerta del Diagnóstico:*
_Pasar de 3,5 a 5 km continuos supuso un salto de +43% en una sola sesión. A 101 kg, esto somete a los tendones a unas 4.500 frenadas violentas. No estás lesionado, sino inflamado por tracción mecánica._

1️⃣ *${t.title.toUpperCase()}*
• *Estructura afectada:* ${t.structure}
• *Causa:* _${t.cause}_
• *Acción Terapéutica Inmediata:*
${t.actions.map((a) => `  └ ${a}`).join('\n')}

2️⃣ *${g.title.toUpperCase()}*
• *Estructura afectada:* ${g.structure}
• *Causa:* _${g.cause}_
• *Acción Terapéutica Inmediata:*
${g.actions.map((a) => `  └ ${a}`).join('\n')}

3️⃣ *${h.title.toUpperCase()}*
${h.actions.map((a) => `  └ ${a}`).join('\n')}

👟 *AJUSTES DE TÉCNICA DE CARRERA OBLIGATORIOS:*
${tech.rules.map((r) => `• ${r}`).join('\n')}
`.trim();
}

/**
 * Formatea el menú científico estructurado de 2.400 kcal
 */
export function formatMenuMarkdown(): string {
  const m = STRUCTURED_MENU_2400;

  return `
🥗 *PLAN NUTRICIONAL CIENTÍFICO DIARIO (2.400 KCAL)*
_Actualizado para 101,0 kg exactos y gasto NEAT elevado (>10.000 pasos). TDEE: 2.900-3.000 kcal. Déficit controlado de ~500-600 kcal._

📊 *Distribución de Macronutrientes:*
• 🔥 *Calorías:* 2.400 kcal/día
• 🥩 *Proteína (2 g/kg):* 202 g/día (~808 kcal) - _Blindaje muscular_
• 🍚 *Carbohidratos:* ~230 g/día (~920 kcal) - _Glucógeno tendinoso_
• 🥑 *Grasas saludables:* 75 g/día (~675 kcal) - _Salud hormonal_
• 💧 *Agua:* 3,5 a 4,0 Litros/día - _Lubricación intraarticular_

🍽️ *Menú Estructurado de 4 Tomas:*
${m.meals
  .map(
    (meal) => `*${meal.slot.toUpperCase()} — ${meal.name}*
📊 _${meal.macros}_
${meal.foodItems.map((f) => `  • ${f}`).join('\n')}
💡 _${meal.timingNote}_`
  )
  .join('\n\n')}

💊 *Suplementación Articular Diaria:*
${m.supplements.map((s) => `• ${s}`).join('\n')}
`.trim();
}

/**
 * Formatea la periodización completa de 22 semanas
 */
export function formatPeriodizationMarkdown(currentWeek?: number): string {
  const weekNum = currentWeek || getCurrentWeekNumber();
  let res = `🏁 *PERIODIZACIÓN DE CARRERA: DE 5K A 21K SIN LESIÓN (22 SEMANAS)*\n`;
  res += `📍 *Semana Actual:* *Semana ${weekNum} de 22*\n\n`;

  const phases = [
    { name: 'FASE 1: BLINDAJE (Sem. 1 a 5)', weeks: [1, 2, 3, 4, 5] },
    { name: 'FASE 2: CONSOLIDACIÓN (Sem. 6 a 11)', weeks: [6, 7, 8, 9, 10, 11] },
    { name: 'FASE 3: RESISTENCIA (Sem. 12 a 18)', weeks: [12, 13, 14, 15, 16, 17, 18] },
    { name: 'FASE 4: PICO & TAPER (Sem. 19 a 21)', weeks: [19, 20, 21] },
    { name: 'SEMANA 22: DÍA DE CARRERA (28 FEBRERO)', weeks: [22] },
  ];

  for (const p of phases) {
    res += `🏆 *${p.name}*\n`;
    for (const w of p.weeks) {
      const plan = RUNNING_PERIODIZATION[w];
      const isCurrent = w === weekNum ? ' 👈 (ESTA SEMANA)' : '';
      res += `  • *Sem ${w}${isCurrent}:* Jue: ${plan.thursdayKm} km | Dom: ${plan.sundayKm} km (${plan.phaseName})\n`;
    }
    res += '\n';
  }

  res += `🎯 *Ritmo rodajes:* 7:15 - 7:35 min/km | *Ritmo Media Maratón:* 6:40 - 6:55 min/km.`;
  return res.trim();
}

/**
 * Formatea el protocolo de suplementación
 */
export function formatSupplementsMarkdown(): string {
  return `
💊 *PROTOCOLO DE SUPLEMENTACIÓN ARTICULAR Y RENDIMIENTO*

1. ⚡ *Creatina Monohidrato (5 g diarios):*
   - *Cuándo:* En la merienda con agua.
   - *Por qué:* Retiene masa muscular, acelera la recuperación de fosfocreatina y previene pérdida de fuerza en déficit.

2. 🐟 *Omega-3 (2 g EPA/DHA diarios):*
   - *Cuándo:* En la cena con las grasas saludables.
   - *Por qué:* Reduce activamente la inflamación sistémica en el tubérculo de Gerdy y tendón rotuliano.

3. 🦴 *Colágeno Hidrolizado + Vitamina C:*
   - *Cuándo:* 30 a 45 minutos ANTES de salir a rodar o de hacer pierna.
   - *Por qué:* Estimula el flujo sanguíneo cargado de aminoácidos específicos al cartílago y tendones durante el estímulo mecánico.

4. ☕ *Cafeína Pre-Entreno (150 a 250 mg):*
   - *Cuándo:* 45 minutos antes de los rodajes del jueves y domingo.
   - *Por qué:* Disminuye la percepción de esfuerzo y fatiga a ritmos continuos.
`.trim();
}
