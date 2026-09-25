// ====================================================================
// PLANIFICACIÓN SEMANAL Y PREPARACIÓN MEDIA MARATÓN: ÁLVARO (101 KG)
// Fecha objetivo: 28 de Febrero de 2027 (Media Maratón 21.097 km)
// ====================================================================

export interface DayRoutine {
  dayName: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  dayIndex: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  title: string;
  category: 'Fuerza' | 'Cardio' | 'Descanso';
  dayType: 'strength' | 'running' | 'rest_refeed';
  description: string;
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
  halfMarathonImpact: string;
}

export interface HalfMarathonCountdown {
  targetDateStr: string;
  daysRemaining: number;
  weeksRemaining: number;
  extraDays: number;
  currentPhase: string;
  phaseDescription: string;
  keyFocusToday: string;
}

export const TARGET_HALF_MARATHON_DATE = '2027-02-28';

export const WEEKLY_ROUTINE: Record<number, DayRoutine> = {
  // 1: LUNES - TREN SUPERIOR (TORSO)
  1: {
    dayName: 'Lunes',
    dayIndex: 1,
    title: 'Entrenamiento de Tren Superior (Torso)',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Hipertrofia de torso, estabilidad escapulohumeral y fuerza postural para correr con los hombros relajados y el pecho abierto.',
    keyGoals: [
      'Fortalecer pectoral, dorsal y deltoides.',
      'Mejorar la postura torácica para no colapsar la respiración en carrera.',
      'Reponer glucógeno tras la tirada larga del domingo.',
    ],
    workoutSummary: [
      'Press de Banca con Barra (4 series x 8-10 reps @ 60 kg - RIR 1-2)',
      'Remo con Barra o Polea Baja (4 series x 10 reps @ 50 kg)',
      'Press Inclinado con Mancuernas (3 series x 10-12 reps @ 50 kg total)',
      'Jalón al Pecho en Polea (3 series x 10-12 reps @ 50 kg)',
      'Elevaciones Laterales con Mancuerna (4 series x 12-15 reps @ 5 kg/lado)',
      'Curl de Bíceps en Banco Inclinado (3 series x 10-12 reps @ 10-12.5 kg)',
      'Extensión de Tríceps en Polea (3 series x 12-15 reps @ 50 kg)',
    ],
    warmup: {
      durationMinutes: 8,
      description:
        'Movilidad articular de hombros, escápulas y muñecas + series de aproximación progresivas.',
      exercises: [
        'Círculos de brazos adelante y atrás (20 reps)',
        'Rotaciones externas e internas con banda elástica (15 reps/lado)',
        'Dislocaciones de hombro con banda elástica o pica (12 reps)',
        'Cat-Cow torácico y aperturas escapulares en suelo (10 reps)',
        '2 series de aproximación en Press de Banca (barra sola de 20kg y luego 40kg)',
      ],
    },
    stretches: {
      durationMinutes: 8,
      description:
        'Descarga estática suave de pectoral, dorsal ancho y musculatura del cuello.',
      exercises: [
        'Estiramiento de pectoral en pared o marco de puerta (30s por lado)',
        'Estiramiento de dorsal ancho colgado de barra o con apoyo (35s)',
        'Estiramiento de tríceps tras nuca (30s por brazo)',
        'Estiramiento de deltoides posterior cruzando el brazo al pecho (30s/brazo)',
        'Inclinaciones laterales suaves de cuello para soltar trapecios (30s)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2380,
      proteinTarget: '170–185 g',
      carbsTarget: '240–270 g',
      fatTarget: '60–70 g',
      waterLiters: 3.0,
      guidelines:
        'Día de fuerza. Distribuir la proteína en 4 tomas sólidas. Mantener los hidratos moderados-altos para favorecer la recuperación celular.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: 'Tostadas de pan 100% integral con tomate, jamón serrano y café con leche desnatada',
          details: '3 rebanadas pan integral + 60g jamón serrano + AOVE suave + 400ml leche desnatada.',
        },
        {
          slot: 'Comida',
          dish: 'Pechuga de pollo o lomo magro con arroz integral y calabacín',
          details: '180g carne magra + 80g arroz en seco (200g cocido) + calabacín y zanahoria.',
        },
        {
          slot: 'Merienda Pre-Entreno',
          dish: 'Bol de avena con yogur griego, Impact Whey, fruta y creatina',
          details: '50g avena + 1 yogur griego ligero + 30g whey + arándanos/plátano + 5g creatina.',
        },
        {
          slot: 'Cena',
          dish: 'Tortilla francesa con queso light y pavo + ensalada verde',
          details: '2 huevos enteros + 2 claras + 40g queso light lonchas + 100g pechuga de pavo.',
        },
      ],
    },
    halfMarathonImpact:
      'Un tren superior fuerte reduce el gasto energético al correr, estabiliza el braceo y evita el dolor de cuello y hombros a partir del km 14 de la Media Maratón.',
  },

  // 2: MARTES - TREN INFERIOR (PIERNA ANTI-IMPACTO)
  2: {
    dayName: 'Martes',
    dayIndex: 2,
    title: 'Entrenamiento de Tren Inferior (Pierna Anti-Impacto)',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Fuerza hipertrófica y refuerzo tendinoso sin impacto (prensa, máquinas, isquios y glúteo) para proteger rodillas, caderas y tobillos.',
    keyGoals: [
      'Blindar el tendón rotuliano e isquiosurales.',
      'Reforzar el glúteo medio para evitar el valgo de rodilla al correr.',
      'Entrenar el sóleo y gemelos como amortiguadores naturales.',
    ],
    workoutSummary: [
      'Prensa Inclinada (4 series x 10-12 reps @ 120-150 kg - excéntrica 3s)',
      'Curl Femoral Sentado (3 series x 10-12 reps @ 60 kg - refuerzo de frenada)',
      'Máquina de Abductores / Glúteo Medio (3 series x 10-12 reps pirámide 70->80->90 kg)',
      'Extensión de Cuádriceps (3 series x 10-12 reps @ 50 kg - vasto interno)',
      'Hiperextensiones en Banco 45° (3 series x 12-15 reps con peso corporal)',
      'Elevación de Talones en Máquina (4 series x 12-15 reps @ +20 kg)',
      'Plancha Lateral Antirrotacional (3 series x 45s por lado)',
    ],
    warmup: {
      durationMinutes: 10,
      description:
        'Activación de dorsiflexión de tobillo, apertura de cadera y activación de glúteo.',
      exercises: [
        'Dorsiflexión de tobillo contra pared (15 reps por pierna)',
        'Sentadilla profunda isométrica con codos empujando rodillas (45s)',
        'Puente de glúteo unilateral en suelo (12 reps por pierna)',
        'Rotaciones de cadera 90/90 en suelo (10 reps alternadas)',
        '2 series de aproximación en Prensa Inclinada (sin peso y luego con 60kg)',
      ],
    },
    stretches: {
      durationMinutes: 10,
      description:
        'Liberación miofascial y estiramientos profundos de cadena inferior.',
      exercises: [
        'Estiramiento de cuádriceps de pie con pelvis neutra (40s por pierna)',
        'Estiramiento de glúteo y piramidal en figura 4 en el suelo (45s por lado)',
        'Estiramiento de isquiotibiales con pierna en banco y espalda erguida (40s)',
        'Estiramiento de gemelo y sóleo en escalón (45s por pierna)',
        'Masaje con pelota de tenis en la planta del pie (fascia plantar) (2 min/pie)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2400,
      proteinTarget: '175–185 g',
      carbsTarget: '260–280 g',
      fatTarget: '65–75 g',
      waterLiters: 3.2,
      guidelines:
        'Día de máxima exigencia muscular. Carga limpia de carbohidratos en comida y cena. No escatimar en agua ni en sodio para evitar sobrecargas musculares.',
      recommendedMeals: [
        {
          slot: 'Comida',
          dish: 'Mollejas de pollo guisadas con plátano macho hervido o patatas cocidas',
          details: '150g mollejas guisadas + 300g plátano macho/patata + lonchas de queso ligero.',
        },
        {
          slot: 'Merienda Pre-Entreno',
          dish: 'Avena con leche desnatada, yogur griego, Impact Whey y 5g de creatina',
          details: '50g avena + 150ml leche desnatada + 1 yogur griego ligero + 30g whey + 5g creatina.',
        },
        {
          slot: 'Cena',
          dish: 'Pescado blanco (merluza o bacalao) con puré de patata y ensalada con AOVE',
          details: '200g pescado blanco + 250g patata cocida triturada + ensalada con tomate y aceite virgen extra.',
        },
      ],
    },
    halfMarathonImpact:
      'Tener cuádriceps y glúteos fuertes absorbe hasta el 70% del impacto contra el asfalto. Es la póliza de seguro contra lesiones de rodilla (cintilla iliotibial y tendinitis rotuliana).',
  },

  // 3: MIÉRCOLES - DESCANSO ACTIVO (ACTIVE RECOVERY)
  3: {
    dayName: 'Miércoles',
    dayIndex: 3,
    title: 'Descanso Activo (Active Recovery & Regeneración)',
    category: 'Descanso',
    dayType: 'rest_refeed',
    description:
      'Cero impacto deportivo. Regeneración neuromuscular tras torso y pierna para asimilar el trabajo de fuerza y llegar fresco al rodaje del jueves.',
    keyGoals: [
      'Favorecer el retorno venoso y drenaje metabólico.',
      'Caminar entre 6.000 y 10.000 pasos relajados.',
      'Descanso mental y articular sin impacto.',
    ],
    workoutSummary: [
      'Paseo al aire libre a ritmo conversacional (6.000 a 10.000 pasos).',
      'Sesión regenerativa de movilidad y descompresión de columna de 15 minutos.',
      'Cero entrenamientos anaeróbicos o sprints.',
    ],
    warmup: {
      durationMinutes: 5,
      description: 'Paseo tranquilo y respiración profunda diafragmática.',
      exercises: ['Caminata a ritmo relajado', 'Rotaciones articulares suaves'],
    },
    stretches: {
      durationMinutes: 15,
      description:
        'Sesión profunda regenerativa de movilidad, psoas y cadena posterior.',
      exercises: [
        'Descompresión de columna colgado de barra (Dead Hang) 3 series de 30s',
        'Postura del niño (Child’s Pose) para lumbar y dorsal (2 minutos)',
        'Estiramiento de psoas y flexores de cadera en zancada baja (45s por lado)',
        'Piernas elevadas en la pared (Viparita Karani) 10 minutos para drenaje venoso',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2280,
      proteinTarget: '165–175 g',
      carbsTarget: '200–230 g',
      fatTarget: '60–70 g',
      waterLiters: 3.0,
      guidelines:
        'Déficit calórico limpio. Proteína alta para reparar microfibras musculares dañadas el lunes y martes. Abundancia de verduras saciantes y digestiones ligeras.',
      recommendedMeals: [
        {
          slot: 'Comida',
          dish: 'Lentejas o garbanzos guisados con verduras y pechuga de pavo/pollo',
          details: 'Plato de legumbre con verduras (sin grasas saturadas) + 150g pechuga de pavo.',
        },
        {
          slot: 'Merienda',
          dish: 'Yogur griego ligero con arándanos, nueces y 5g de creatina',
          details: '150g yogur griego ligero + puñado arándanos + 15g nueces + 5g creatina.',
        },
        {
          slot: 'Cena',
          dish: 'Revuelto de champiñones o espárragos trigueros con gambas y claras',
          details: '200g champiñones/espárragos + 150g gambas + 3 claras de huevo + ensalada verde.',
        },
      ],
    },
    halfMarathonImpact:
      'La recuperación es cuando el cuerpo se reconstruye y se hace más rápido. El descanso activo evita el sobreentrenamiento y mantiene las piernas receptivas.',
  },

  // 4: JUEVES - CARRERA CORTA (CALIDAD & TEMPO)
  4: {
    dayName: 'Jueves',
    dayIndex: 4,
    title: 'Carrera Corta (Calidad, Ritmo & Umbral)',
    category: 'Cardio',
    dayType: 'running',
    description:
      'Sesión de running específica de 5 a 8 km. Trabajo de cadencia (170-180 spm), economía de carrera y ritmo objetivo de Media Maratón.',
    keyGoals: [
      'Calibrar el ritmo de crucero de la Media Maratón (~5:15 - 5:35 min/km).',
      'Entrenar la zancada eficiente y apoyo de mediopié.',
      'Controlar la frecuencia cardíaca en zona 3 controlada.',
    ],
    workoutSummary: [
      '1 km de trote suave progresivo de calentamiento (6:15 -> 5:45 min/km).',
      '4 a 6 km a ritmo tempo sostenido (~5:15 a 5:35 min/km).',
      '1 km de enfriamiento muy suave al trote.',
      'Total de la sesión: 6 a 8 km acumulados.',
    ],
    warmup: {
      durationMinutes: 10,
      description:
        'Calentamiento dinámico balístico imprescindible antes de correr para evitar tirones y contracturas.',
      exercises: [
        'Balanceos de piernas frontales y laterales (Leg Swings) 15 reps/pierna',
        'Skipping bajo y movilidad circular de tobillos (2 series de 20m)',
        'Talones a los glúteos y zancadas dinámicas (2 series de 20m)',
        'Paso ruso con piernas rectas para activación isquiosural (2 series de 20m)',
        '2 progresiones de 50m acelerando de menos a más',
      ],
    },
    stretches: {
      durationMinutes: 10,
      description:
        'Estiramientos estáticos post-carrera para gemelos, sóleos, psoas y tendón de Aquiles.',
      exercises: [
        'Caminar 3-5 minutos para bajar pulsaciones a reposo (<110 bpm)',
        'Estiramiento de sóleo contra pared con rodilla flexionada (45s por pierna)',
        'Estiramiento de gemelo con rodilla estirada y talón clavado (45s por pierna)',
        'Estiramiento de caballero para el psoas ilíaco (45s por pierna)',
        'Estiramiento suave de isquiotibiales sin tirones (40s por pierna)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2420,
      proteinTarget: '170–180 g',
      carbsTarget: '260–290 g',
      fatTarget: '60–70 g',
      waterLiters: 3.2,
      guidelines:
        'Comida rica en hidratos de rápida digestión 3 horas antes de correr. Evitar grasas pesadas o exceso de fibra en las horas previas. Rehidratar con agua y sodio tras el entreno.',
      recommendedMeals: [
        {
          slot: 'Comida (3h pre-carrera)',
          dish: 'Pasta o arroz blanco con pollo y salsa de tomate casera suave',
          details: '90g pasta/arroz en seco + 150g pechuga pollo + tomate frito suave (digestión muy rápida).',
        },
        {
          slot: 'Pre-Carrera (45 min antes)',
          dish: 'Café solo con agua + 1 plátano maduro o dátil',
          details: 'Cafeína natural como activador + carbohidrato simple sin fibra para el entreno.',
        },
        {
          slot: 'Cena Post-Carrera',
          dish: 'Patatas al horno con lomo de cerdo cocinado o ternera magra y ensalada',
          details: '300g patatas asadas + 160g lomo magro + ensalada de tomate con sal marina (reponer sodio).',
        },
      ],
    },
    halfMarathonImpact:
      'Esta sesión acostumbra a las piernas a sostener el ritmo objetivo sin acumular lactato excesivo. Es el motor de tu velocidad para el 28 de febrero.',
  },

  // 5: VIERNES - FULL BODY (FUERZA GLOBAL)
  5: {
    dayName: 'Viernes',
    dayIndex: 5,
    title: 'Entrenamiento Full Body (Fuerza Global Multiarticular)',
    category: 'Fuerza',
    dayType: 'strength',
    description:
      'Fuerza funcional de cuerpo completo. Patrones compuestos de empuje, tracción, bisagra de cadera y estabilidad central para consolidar la semana.',
    keyGoals: [
      'Trabajar glúteo mayor y cadena posterior con Hip Thrust.',
      'Fuerza de hombros con press militar y estabilidad de escápulas.',
      'Reforzar el core antirrotacional para evitar la torsión en carrera.',
    ],
    workoutSummary: [
      'Sentadilla Trasera con Barra o Búlgara con Mancuernas (3 series x 8-10 reps @ 70 kg)',
      'Press Militar con Mancuernas (3 series x 10 reps @ 18 kg/mancuerna)',
      'Hip Thrust con Barra / Puente de Glúteos (3 series x 10-12 reps @ 80 kg)',
      'Remo Unilateral con Mancuerna (3 series x 10 reps @ 22 kg/lado)',
      'Face Pull en Polea para manguito rotador y deltoides posterior (3 series x 15 reps @ 25 kg)',
      'Crunch en Polea o Elevaciones de Piernas al Pecho (3 series x 15 reps @ 35 kg)',
    ],
    warmup: {
      durationMinutes: 8,
      description: 'Activación global: cadera, hombro, escápulas y zona media.',
      exercises: [
        'World’s Greatest Stretch (zancada profunda + torsión torácica) 6 reps/lado',
        'Sentadilla profunda sin peso con pausa de 3s en el fondo (10 reps)',
        'Puente de glúteos bipodal con banda elástica (15 reps)',
        'Plancha frontal activa con empuje escapular (45s)',
      ],
    },
    stretches: {
      durationMinutes: 8,
      description:
        'Descarga completa de glúteos, columna lumbar y flexores de cadera.',
      exercises: [
        'Estiramiento piramidal y glúteo medio sentado en banco (45s por lado)',
        'Child’s pose con brazos estirados al frente (1 minuto)',
        'Estiramiento de pectoral en pared (30s por lado)',
        'Estiramiento de flexor de cadera en zancada baja (40s por lado)',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2380,
      proteinTarget: '175–185 g',
      carbsTarget: '240–270 g',
      fatTarget: '65–75 g',
      waterLiters: 3.0,
      guidelines:
        'Día de fuerza. Ingesta sólida de proteínas repartida en 4 tomas. Creatina en la merienda para asegurar depósitos saturados.',
      recommendedMeals: [
        {
          slot: 'Comida',
          dish: 'Guiso magro de ternera o pollo con patatas y verduras',
          details: '160g ternera magra + 250g patatas + zanahoria y judías verdes.',
        },
        {
          slot: 'Merienda',
          dish: 'Bol de avena con yogur griego, whey, arándanos y 5g de creatina',
          details: '50g avena + 125g yogur griego ligero + 30g proteína whey + arándanos + 5g creatina.',
        },
        {
          slot: 'Cena',
          dish: 'Huevos a la plancha con taquitos de jamón serrano y ensalada templada',
          details: '2 huevos enteros + 2 claras + 50g jamón serrano + ensalada variada con AOVE.',
        },
      ],
    },
    halfMarathonImpact:
      'El Hip Thrust y las sentadillas aumentan la potencia de zancada en cada metro que corres, reduciendo el coste metabólico en los kilómetros finales.',
  },

  // 6: SÁBADO - DESCANSO COMPLETO & CARGA (CARB LOADING)
  6: {
    dayName: 'Sábado',
    dayIndex: 6,
    title: 'Descanso Completo & Carga Pre-Tirada (Carb Loading)',
    category: 'Descanso',
    dayType: 'rest_refeed',
    description:
      'CERO IMPACTO. Día clave para recargar los depósitos de glucógeno hepático y muscular para la carrera larga del domingo. Piernas en reposo y mucha agua.',
    keyGoals: [
      'Descanso pasivo total: cero entrenamientos o desgaste innecesario.',
      'Saturar los depósitos de glucógeno muscular con hidratos limpios.',
      'Hidratación de 3.5 L con sales para llegar hidratado al domingo.',
    ],
    workoutSummary: [
      'Descanso pasivo total. Prohibido correr, saltar o hacer esfuerzos intensos.',
      'Paseo opcional ultra relajado si apetece, pero priorizar recuperar.',
      'Dormir 8 horas para optimizar el sistema nervioso central.',
    ],
    warmup: {
      durationMinutes: 0,
      description: 'Sin calentamiento requerido. Día de descanso pasivo.',
      exercises: [],
    },
    stretches: {
      durationMinutes: 10,
      description:
        'Movilidad suave o piernas elevadas para descargar el retorno circulatorio.',
      exercises: [
        'Piernas elevadas en vertical contra la pared (10-15 minutos antes de dormir)',
        'Movilidad suave de tobillos y respiración diafragmática profunda',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2500,
      proteinTarget: '165–175 g',
      carbsTarget: '280–320 g',
      fatTarget: '55–65 g',
      waterLiters: 3.5,
      guidelines:
        'CARGA ESTRATÉGICA DE CARBOHIDRATOS (Pre-Tirada Larga). Priorizar hidratos limpios y reducir grasas para facilitar vaciado gástrico. Beber 3.5 L de agua con una pizca de sal marina o electrolitos.',
      recommendedMeals: [
        {
          slot: 'Desayuno',
          dish: 'Tostadas generosas de pan integral con plátano y mermelada + pavo',
          details: '3-4 rebanadas pan 100% integral + plátano en rodajas + mermelada + 60g pavo + café.',
        },
        {
          slot: 'Comida',
          dish: 'Plato generoso de pasta o noodles con pollo y salsa de tomate casera',
          details: '110g pasta en seco (o 250g cocida) + 150g pechuga de pollo + salsa de tomate suave.',
        },
        {
          slot: 'Merienda',
          dish: 'Bol de avena dulce con leche desnatada, canela, manzana y whey',
          details: '60g avena cocinada con leche desnatada y canela + 25g whey + 1 manzana laminada + 5g creatina.',
        },
        {
          slot: 'Cena (Temprana y limpia)',
          dish: 'Arroz blanco con pescado blanco (merluza o lenguado) y zanahoria',
          details: '80g arroz en seco (200g cocido) + 180g merluza plancha + zanahorias baby. Cena limpia para dormir profundo.',
        },
      ],
    },
    halfMarathonImpact:
      'Llegar a la tirada larga del domingo con los depósitos vacíos te hace chocar contra el muro al km 10. La carga del sábado garantiza energía estable en los 12-18 km.',
  },

  // 0: DOMINGO - CARRERA LARGA (LONG RUN — SIMULADOR MEDIA MARATÓN)
  0: {
    dayName: 'Domingo',
    dayIndex: 0,
    title: 'Carrera Larga (Long Run — Simulador Media Maratón)',
    category: 'Cardio',
    dayType: 'running',
    description:
      'LA SESIÓN REINA DE LA PREPARACIÓN. Tirada larga aeróbica en Zona 2 (puedes hablar sin ahogarte, pulso estable ~142-152 bpm). Progresión de 10-12 km hasta 18-20 km hacia el 28 de febrero.',
    keyGoals: [
      'Construir resistencia aeróbica y capacidad mitocondrial.',
      'Entrenar la quema eficiente de grasas a ritmo constante.',
      'Testear la hidratación en ruta y geles para el 28 de febrero.',
    ],
    workoutSummary: [
      '1-2 km iniciales lentos a ritmo diésel de calentamiento (6:15 - 6:30 min/km).',
      'Bloque principal continuo en Zona 2 controlada a ritmo cómodo y constante (~5:40 - 6:00 min/km).',
      'Último kilómetro a ritmo objetivo de Media Maratón (~5:20 min/km) para simular la meta.',
      'Distancia objetivo: 10 a 14 km (avanzando a 16-18 km en diciembre/enero).',
    ],
    warmup: {
      durationMinutes: 10,
      description:
        'Calentamiento dinámico articular de cadera, rodillas y tobillos antes de salir a la calle.',
      exercises: [
        'Círculos de tobillos y rotaciones suaves de rodillas (15 reps/lado)',
        'Leg swings frontales y laterales suaves (10 reps/lado)',
        'Caminar rápido 3 minutos antes de iniciar el primer trote suave',
      ],
    },
    stretches: {
      durationMinutes: 12,
      description:
        'Estiramientos suaves de toda la musculatura inferior tras la tirada larga.',
      exercises: [
        'Caminar 5 minutos para retorno venoso gradual y bajada de pulsaciones',
        'Estiramiento de sóleo y tendón de Aquiles (50s por pierna)',
        'Estiramiento de gemelos en bordillo o escalón (50s por pierna)',
        'Estiramiento de cuádriceps y psoas ilíaco con apoyo (45s por pierna)',
        'Estiramiento de glúteos e isquiotibiales en suelo (1 min por pierna)',
        'Rehidratación inmediata con agua fresca y sales minerales',
      ],
    },
    nutritionStrategy: {
      calorieTarget: 2500,
      proteinTarget: '175–185 g',
      carbsTarget: '290–330 g',
      fatTarget: '65–75 g',
      waterLiters: 3.5,
      guidelines:
        'Desayuno pre-tirada 90-120 min antes, ligero y rico en hidratos. Si la tirada supera 75 min, llevar agua y 1 gel energético. Comida post-carrera completa con hidratos para reponer todo el glucógeno quemado.',
      recommendedMeals: [
        {
          slot: 'Desayuno Pre-Carrera (90 min antes)',
          dish: 'Tostadas integrales con plátano maduro y miel + café solo',
          details: '2 tostadas pan integral + 1 plátano en rodajas + chorrito de miel + vaso de agua grande + café solo.',
        },
        {
          slot: 'Durante la Carrera (>75 min)',
          dish: 'Agua cada 20 min + 1 gel con agua al km 8-10',
          details: 'Sorbos pequeños para entrenar la tolerancia gástrica del día de la prueba.',
        },
        {
          slot: 'Comida Post-Tirada (La Celebración)',
          dish: 'Paella / Arroz con pollo abundante o pasta completa con carne magra y verdura',
          details: 'Arroz o pasta abundante (120g en seco) + 180g carne de pollo/ternera + verduras + fruta de postre.',
        },
        {
          slot: 'Merienda',
          dish: 'Batido recuperador de Whey con leche desnatada y fruta fresca',
          details: '30g whey + 250ml leche desnatada + 1 plátano + 5g creatina.',
        },
        {
          slot: 'Cena',
          dish: 'Tortilla de patatas o patatas al vapor con salmón/pollo y ensalada',
          details: 'Patatas cocidas + proteína magra + ensalada grande con aceite de oliva virgen extra.',
        },
      ],
    },
    halfMarathonImpact:
      'Esta es la sesión que determina si completas la Media Maratón con solvencia. Cada domingo sumas adaptaciones cardíacas y capilarización muscular directa para el 28 de febrero.',
  },
};

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
 * Calcula la cuenta atrás y fase de preparación para la Media Maratón del 28 de febrero de 2027
 */
export function getHalfMarathonCountdown(currentDate?: Date | string): HalfMarathonCountdown {
  const now = getSpainDate(currentDate);
  const target = new Date('2027-02-28T09:00:00+01:00');
  const diffMs = target.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.floor(daysRemaining / 7);
  const extraDays = daysRemaining % 7;

  let currentPhase = 'Fase 1: Construcción de Base Aeróbica y Fuerza Anti-Impacto';
  let phaseDescription =
    'Prioridad: Rodajes cómodos en Zona 2 para capilarización y fuerza pesada anti-impacto (prensa, isquios) para proteger articulaciones de cara al volumen alto.';
  let keyFocusToday =
    'Mantener el pulso controlado en carrera y completar las series pesadas de fuerza sin llegar al fallo lesivo.';

  if (weeksRemaining < 3) {
    currentPhase = 'Fase 4: Tapering, Descarga y Supercompensación';
    phaseDescription =
      'Prioridad: Reducir drásticamente el volumen de km (-40%), mantener toques cortos de intensidad y descansar. Llenar los depósitos de glucógeno para el 28 de febrero.';
    keyFocusToday = 'Descanso, sueño profundo, estiramientos suaves y visualización de la carrera.';
  } else if (weeksRemaining < 10) {
    currentPhase = 'Fase 3: Especificidad, Series y Adaptación Nutricional';
    phaseDescription =
      'Prioridad: Tiradas de 16-18 km, ritmos sostenidos a 5:15-5:30 min/km y entrenamiento de geles/hidratación cada 45 minutos.';
    keyFocusToday = 'Probar geles en la tirada larga y ajustar ritmos de paso por kilómetro.';
  } else if (weeksRemaining < 18) {
    currentPhase = 'Fase 2: Progresión de Volumen y Capacidad Cardiovascular';
    phaseDescription =
      'Prioridad: Aumentar la tirada dominical progresivamente de 11 km a 15 km e introducir cambios de ritmo los jueves.';
    keyFocusToday = 'Constancia semanal y no saltarse los descansos del miércoles y sábado.';
  }

  return {
    targetDateStr: '28 de Febrero de 2027',
    daysRemaining,
    weeksRemaining,
    extraDays,
    currentPhase,
    phaseDescription,
    keyFocusToday,
  };
}

/**
 * Formatea el reporte completo del día para el bot de Telegram
 */
export function formatDailyScheduleMarkdown(date?: Date | string): string {
  const routine = getTodayRoutine(date);
  const countdown = getHalfMarathonCountdown(date);
  const todayDateStr = getSpainDate(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return `
📅 *HOY ES ${routine.dayName.toUpperCase()} (${todayDateStr})*
🎯 *Sesión:* *${routine.title}*
🏷️ *Categoría:* ${routine.category} | *Tipo Protocolo:* ${routine.dayType.toUpperCase()}

📝 *Objetivo del Día:*
_${routine.description}_

🏋️‍♂️ *Plan de Trabajo:*
${routine.workoutSummary.map((item) => `• ${item}`).join('\n')}

🔥 *Calentamiento Sugerido (${routine.warmup.durationMinutes} min):*
_${routine.warmup.description}_
${routine.warmup.exercises.length > 0 ? routine.warmup.exercises.map((e) => `  └ ${e}`).join('\n') : '  └ _Día de descanso: sin calentamiento_'}

🧘‍♂️ *Estiramientos Post-Sesión (${routine.stretches.durationMinutes} min):*
_${routine.stretches.description}_
${routine.stretches.exercises.map((e) => `  └ ${e}`).join('\n')}

🥗 *Estrategia Nutricional de Hoy:*
• Calorías objetivo: *${routine.nutritionStrategy.calorieTarget} kcal*
• Proteína: *${routine.nutritionStrategy.proteinTarget}*
• Carbohidratos: *${routine.nutritionStrategy.carbsTarget}*
• Grasas: *${routine.nutritionStrategy.fatTarget}*
• Agua: *${routine.nutritionStrategy.waterLiters} L*
💡 _${routine.nutritionStrategy.guidelines}_

🍽️ *Platos / Comidas Recomendadas para Hoy:*
${routine.nutritionStrategy.recommendedMeals.map((m) => `• *${m.slot}:* ${m.dish}\n  └ _${m.details}_`).join('\n\n')}

🏁 *Rumbo a la Media Maratón (28/02/2027):*
⏳ Quedan *${countdown.daysRemaining} días* (*${countdown.weeksRemaining} semanas y ${countdown.extraDays} días*)
📍 *${countdown.currentPhase}*
💡 _${routine.halfMarathonImpact}_
`.trim();
}

/**
 * Formatea la semana completa de lunes a domingo
 */
export function formatWeeklyScheduleMarkdown(): string {
  const days = [1, 2, 3, 4, 5, 6, 0];
  let res = `🗓️ *RUTINA SEMANAL COMPLETA — ÁLVARO (OBJETIVO MEDIA MARATÓN)*\n\n`;

  for (const d of days) {
    const r = WEEKLY_ROUTINE[d];
    res += `*${r.dayName.toUpperCase()}:* *${r.title}*\n`;
    res += `  └ 🎯 ${r.description}\n`;
    res += `  └ 🥗 Calorías: *${r.nutritionStrategy.calorieTarget} kcal* | 💧 *${r.nutritionStrategy.waterLiters} L*\n\n`;
  }

  res += `🏁 *Meta:* Media Maratón el *28 de Febrero de 2027* (21,097 km).\n`;
  res += `💡 *Regla de oro:* El sábado descansas para que el domingo puedas volar en la tirada larga.`;
  return res.trim();
}
