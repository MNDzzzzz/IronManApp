'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Flame,
  Droplet,
  Trash2,
  Mic,
  Settings2,
  Calendar,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Bookmark,
  X,
} from 'lucide-react';
import { NutritionLog, WaterLog } from '@/types/database';
import { initialFrequentFoods, DayType } from '@/lib/nutritionProtocol';
import { getTodayRoutine, getSpainDate } from '@/lib/weeklyRoutine';
import {
  FREQUENT_MEAL_PRESETS,
  MealBlockTemplate,
  generateTypicalDayMeals,
  calculateMealTotals,
} from '@/lib/nutritionPresets';
import { AppleSwitch } from '@/components/common/AppleSwitch';

interface NutritionViewProps {
  meals: NutritionLog[];
  waterLogs: WaterLog[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  onAddWater: (amountMl: number, date?: string) => Promise<void>;
  onDeleteWater?: (waterId: string) => Promise<void>;
  onAddMeal: (mealData: Partial<NutritionLog>) => Promise<void>;
  onDeleteMeal?: (mealId: string) => Promise<void>;
  onAddMealsBatch?: (mealsData: Partial<NutritionLog>[]) => Promise<void>;
  onRefreshData?: () => void;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  meals,
  waterLogs,
  totals,
  onAddWater,
  onDeleteWater,
  onAddMeal,
  onDeleteMeal,
  onAddMealsBatch,
  onRefreshData,
}) => {
  // Fecha seleccionada (por defecto hoy en España)
  const todayStr = useMemo(() => getSpainDate().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Estados de modales y acordeones
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showFrequentFoods, setShowFrequentFoods] = useState(false);
  const [showRecommendedMenu, setShowRecommendedMenu] = useState(false);

  // Formulario de comida manual
  const [mealType, setMealType] = useState<'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack'>('Almuerzo');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('550');
  const [protein, setProtein] = useState('40');
  const [carbs, setCarbs] = useState('50');
  const [fat, setFat] = useState('18');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del protocolo personal del atleta
  const [weightKg, setWeightKg] = useState(101.0);
  const [dayType, setDayTypeState] = useState<DayType>('running');
  const [targetCalories, setTargetCalories] = useState(2400);
  const [targetProtein, setTargetProtein] = useState(202);
  const [targetCarbs, setTargetCarbs] = useState(230);
  const [targetFat, setTargetFat] = useState(75);
  const [targetWater, setTargetWater] = useState(3800);
  const [creatineTaken, setCreatineTaken] = useState(false);

  // Rutina y prescripción oficial para la fecha seleccionada
  const currentRoutine = useMemo(() => {
    return getTodayRoutine(selectedDate);
  }, [selectedDate]);

  // Lista dinámica de fechas disponibles
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    meals.forEach((m) => {
      if (m.date) datesSet.add(m.date);
    });
    waterLogs.forEach((w) => {
      if (w.date) datesSet.add(w.date);
    });

    const today = new Date();
    const start = new Date('2026-09-21T12:00:00');
    const end = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    const curr = new Date(start);
    while (curr <= end) {
      datesSet.add(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    return Array.from(datesSet).sort().reverse();
  }, [meals, waterLogs]);

  // Cargar estado inicial del protocolo
  useEffect(() => {
    fetch('/api/protocol')
      .then((res) => res.json())
      .then((data) => {
        if (data.protocol) {
          setWeightKg(data.protocol.weight_kg || 101.0);
          setDayTypeState(data.protocol.day_type || 'running');
          setTargetCalories(data.protocol.target_calories || 2400);
          setTargetProtein(data.protocol.target_protein || 202);
          setTargetCarbs(data.protocol.target_carbs || 230);
          setTargetFat(data.protocol.target_fat || 75);
          setTargetWater(data.protocol.target_water || 3800);
          setCreatineTaken(!!data.protocol.creatine_taken);
        }
      })
      .catch((e) => console.warn('Aviso cargando protocolo nutricional:', e));
  }, []);

  // Filtrar comidas para la fecha activa
  const displayedMeals = useMemo(() => {
    return meals.filter((m) => m.date === selectedDate);
  }, [meals, selectedDate]);

  // Filtrar agua para la fecha activa
  const displayedWater = useMemo(() => {
    return waterLogs.filter((w) => w.date === selectedDate);
  }, [waterLogs, selectedDate]);

  // Totales calculados para la fecha seleccionada
  const activeTotals = useMemo(() => {
    if (selectedDate === todayStr) {
      return totals;
    }
    const cal = displayedMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const prot = displayedMeals.reduce((acc, m) => acc + (m.protein_g || 0), 0);
    const crb = displayedMeals.reduce((acc, m) => acc + (m.carbs_g || 0), 0);
    const ft = displayedMeals.reduce((acc, m) => acc + (m.fat_g || 0), 0);
    const wtr = displayedWater.reduce((acc, w) => acc + (w.amount_ml || 0), 0);
    return {
      calories: Math.round(cal),
      protein_g: Number(prot.toFixed(1)),
      carbs_g: Number(crb.toFixed(1)),
      fat_g: Number(ft.toFixed(1)),
      water_ml: wtr,
    };
  }, [selectedDate, todayStr, totals, displayedMeals, displayedWater]);

  // Objetivo de calorías según la rutina oficial del día
  const activeTargetCalories = useMemo(() => {
    if (currentRoutine.nutritionStrategy?.calorieTarget) {
      return currentRoutine.nutritionStrategy.calorieTarget;
    }
    return targetCalories;
  }, [currentRoutine, targetCalories]);

  const activeTargetWater = useMemo(() => {
    if (currentRoutine.nutritionStrategy?.waterLiters) {
      return currentRoutine.nutritionStrategy.waterLiters * 1000;
    }
    return targetWater;
  }, [currentRoutine, targetWater]);

  const handleToggleCreatine = async () => {
    const nextState = !creatineTaken;
    setCreatineTaken(nextState);
    try {
      await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_creatine' }),
      });
    } catch (e) {
      console.error('Error guardando creatina:', e);
    }
  };

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_targets',
          weight_kg: weightKg,
          day_type: dayType,
          target_calories: targetCalories,
          target_protein: targetProtein,
          target_carbs: targetCarbs,
          target_fat: targetFat,
          target_water: targetWater,
        }),
      });
      setShowProtocolModal(false);
    } catch (e) {
      console.error('Error guardando protocolo:', e);
    }
  };

  // Estados para Día Típico Cumplido y Plantillas de Comidas
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedPresetTab, setSelectedPresetTab] = useState<'Todos' | 'Desayuno' | 'Almuerzo' | 'Merienda' | 'Cena'>('Todos');
  const [showTypicalConfirm, setShowTypicalConfirm] = useState(false);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchToast, setBatchToast] = useState<string | null>(null);

  // Lote oficial del día según la rutina
  const typicalMealsForDay = useMemo(() => {
    return generateTypicalDayMeals(selectedDate);
  }, [selectedDate]);

  // Tomas que todavía no se han registrado hoy
  const missingTypicalMeals = useMemo(() => {
    const existingTypes = new Set(
      displayedMeals.map((m) => (m.meal_type || '').toLowerCase().trim())
    );
    return typicalMealsForDay.filter((m) => {
      const norm = (m.meal_type || '').toLowerCase().trim();
      if (norm === 'snack' && (existingTypes.has('snack') || existingTypes.has('merienda'))) {
        return false;
      }
      return !existingTypes.has(norm);
    });
  }, [displayedMeals, typicalMealsForDay]);

  // Ejecutar lote de inserción
  const handleExecuteBatch = async (mealsToInsert: Partial<NutritionLog>[]) => {
    if (mealsToInsert.length === 0) return;
    setIsApplyingBatch(true);
    try {
      if (onAddMealsBatch) {
        await onAddMealsBatch(mealsToInsert);
      } else {
        const res = await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_insert',
            meals: mealsToInsert,
            date: selectedDate,
          }),
        });
        if (!res.ok) {
          for (const m of mealsToInsert) {
            await onAddMeal({ ...m, date: selectedDate });
          }
        }
      }

      const totals = calculateMealTotals(mealsToInsert);
      setBatchToast(`⚡ Registradas ${mealsToInsert.length} tomas (+${totals.calories} kcal, ${totals.protein_g}g prot)`);
      setTimeout(() => setBatchToast(null), 3500);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('Error aplicando lote de comidas:', e);
      setBatchToast('Error al registrar lote de comidas.');
      setTimeout(() => setBatchToast(null), 3000);
    } finally {
      setIsApplyingBatch(false);
      setShowTypicalConfirm(false);
    }
  };

  // Botón Día Típico Cumplido (1-Tap con confirmación si ya hay comidas)
  const handleTypicalDayClick = () => {
    if (displayedMeals.length === 0) {
      handleExecuteBatch(typicalMealsForDay);
    } else {
      setShowTypicalConfirm(true);
    }
  };

  // Añadir una plantilla individual (1-Tap)
  const handleAddPresetMeal = async (preset: MealBlockTemplate) => {
    try {
      await onAddMeal({
        date: selectedDate,
        meal_type: preset.meal_type,
        description: preset.description,
        calories: preset.calories,
        protein_g: preset.protein_g,
        carbs_g: preset.carbs_g,
        fat_g: preset.fat_g,
      });
      setBatchToast(`+ Registrado ${preset.name} (+${preset.calories} kcal)`);
      setTimeout(() => setBatchToast(null), 2500);
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('Error añadiendo plantilla:', e);
    }
  };

  const filteredPresets = useMemo(() => {
    if (selectedPresetTab === 'Todos') return FREQUENT_MEAL_PRESETS;
    if (selectedPresetTab === 'Merienda') {
      return FREQUENT_MEAL_PRESETS.filter((p) => p.meal_type === 'Snack');
    }
    return FREQUENT_MEAL_PRESETS.filter((p) => p.meal_type === selectedPresetTab);
  }, [selectedPresetTab]);

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddMeal({
        date: selectedDate,
        meal_type: mealType,
        description: description.trim(),
        calories: Number(calories),
        protein_g: Number(protein),
        carbs_g: Number(carbs),
        fat_g: Number(fat),
      });
      setDescription('');
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-24 px-3.5 pt-1 font-sans animate-in fade-in duration-300">
      {/* CABECERA Y BOTONES DE ACCIÓN */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Dieta & Nutrición
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Protocolo Maratón + Fuerza • <span className="text-[#D97757] font-bold">{weightKg} kg</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresetsModal(true)}
            className="p-2 rounded-2xl liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
            title="Plantillas de Comidas Frecuentes"
            aria-label="Plantillas de comidas frecuentes"
          >
            <Bookmark className="w-4 h-4 text-[#D97757]" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>
          <button
            onClick={() => setShowProtocolModal(true)}
            className="p-2 rounded-2xl liquid-glass-card text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
            title="Ajustar protocolo y objetivos"
            aria-label="Ajustar protocolo y objetivos"
          >
            <Settings2 className="w-4 h-4 text-[#D97757]" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="py-2 px-3.5 rounded-2xl bg-[#D97757] text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-[#D97757]/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Añadir
          </button>
        </div>
      </div>

      {/* SELECTOR DINÁMICO DE FECHAS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-1">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-primary)]">
            <Calendar className="w-3.5 h-3.5 text-[#D97757]" />
            Calendario & Rutina
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
              {selectedDate === todayStr ? 'Hoy' : selectedDate}
            </span>
            <label className="relative p-1 px-2.5 rounded-xl liquid-glass-pill text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Seleccionar otra fecha"
              />
              <Calendar className="w-3 h-3 text-[#D97757]" />
              <span>Elegir fecha</span>
            </label>
          </div>
        </div>

        {/* Tira deslizable de días */}
        <div className="flex items-center gap-1.5 p-1.5 liquid-glass-card overflow-x-auto">
          {availableDates.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === todayStr;
            const routine = getTodayRoutine(dStr);
            const dObj = new Date(dStr + 'T12:00:00');
            const dayOfWeek = dObj.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = dObj.getDate();
            const hasMeals = meals.some((m) => m.date === dStr);
            const hasWater = waterLogs.some((w) => w.date === dStr);

            let badgeText = 'Plan';
            if (routine.category === 'Fuerza') {
              badgeText = routine.dayName === 'Lunes' ? 'Torso' : routine.dayName === 'Martes' ? 'Pierna' : 'Full Body';
            } else if (routine.category === 'Cardio') {
              badgeText = routine.dayName === 'Jueves' ? '4k CaCo' : 'Tirada';
            } else {
              badgeText = routine.dayName === 'Miércoles' ? 'Refeed' : 'Descanso';
            }

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDate(dStr)}
                className={`py-1.5 px-3 rounded-2xl text-center transition-all whitespace-nowrap flex flex-col items-center min-w-[68px] relative ${
                  isSelected
                    ? 'bg-[#D97757] text-white shadow-md font-bold'
                    : 'liquid-glass-pill text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] leading-tight">
                  <span className="capitalize font-bold">{dayOfWeek}</span>
                  <span className="font-mono text-xs">{dayNum}</span>
                </div>
                <span
                  className={`text-[9px] mt-0.5 px-1 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-black/20 text-white'
                      : routine.category === 'Fuerza'
                      ? 'text-[#2D68C4]'
                      : routine.category === 'Cardio'
                      ? 'text-[#FC5200]'
                      : 'text-emerald-500'
                  }`}
                >
                  {isToday ? 'Hoy' : badgeText}
                </span>

                {(hasMeals || hasWater) && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                      isSelected ? 'bg-white' : 'bg-emerald-500'
                    }`}
                    title="Tiene registros"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FICHA RESUMEN DEL DÍA (EDITORIAL APPLE) */}
      <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                currentRoutine.category === 'Fuerza'
                  ? 'bg-[#2D68C4]/15 text-[#2D68C4] border border-[#2D68C4]/20'
                  : currentRoutine.category === 'Cardio'
                  ? 'bg-[#FC5200]/15 text-[#FC5200] border border-[#FC5200]/20'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {currentRoutine.category}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)] editorial-heading">
              {currentRoutine.dayName} • {currentRoutine.title}
            </span>
          </div>
          <span className="text-xs font-bold text-[#D97757] font-mono data-tabular">
            {activeTargetCalories} kcal
          </span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {currentRoutine.nutritionStrategy.guidelines}
        </p>

        {/* Resumen de objetivos prescritos */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono data-tabular">
          <div className="p-2 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
            <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Kcal</span>
            <span className="font-bold text-xs text-[var(--text-primary)]">{activeTargetCalories}</span>
          </div>
          <div className="p-2 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
            <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Proteína</span>
            <span className="font-bold text-xs text-rose-500">{currentRoutine.nutritionStrategy.proteinTarget.split(' ')[0]}</span>
          </div>
          <div className="p-2 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
            <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Carbos</span>
            <span className="font-bold text-xs text-amber-500">{currentRoutine.nutritionStrategy.carbsTarget.split(' ')[0]}</span>
          </div>
          <div className="p-2 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)]">
            <span className="text-[9px] text-[var(--text-tertiary)] block uppercase">Agua</span>
            <span className="font-bold text-xs text-blue-500">{currentRoutine.nutritionStrategy.waterLiters}L</span>
          </div>
        </div>
      </div>

      {/* BENTO GRID: COLUMNA 1 (MACROS) & COLUMNA 2 (HIDRATACIÓN Y SUPLEMENTOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TARJETA DE CALORÍAS Y MACRONUTRIENTES */}
        <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider editorial-heading">Calorías ({selectedDate === todayStr ? 'Hoy' : selectedDate})</span>
                <div className="text-3xl font-black text-[var(--text-primary)] editorial-heading font-mono data-tabular mt-0.5">
                  {activeTotals.calories}{' '}
                  <span className="text-xs font-normal text-[var(--text-secondary)] font-sans">/ {activeTargetCalories}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider editorial-heading">Restante</span>
                <div className="text-lg font-bold text-[#D97757] dark:text-[#E28464] editorial-heading font-mono data-tabular mt-0.5">
                  {Math.max(0, activeTargetCalories - activeTotals.calories)} <span className="text-xs font-normal text-[var(--text-secondary)] font-sans">kcal</span>
                </div>
              </div>
            </div>

            {/* Barra de progreso de calorías */}
            <div className="w-full bg-[var(--glass-surface-thick)] h-2 rounded-full overflow-hidden mt-3 border border-[var(--glass-border)]">
              <div
                className="bg-gradient-to-r from-[#D97757] to-[#E28464] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.calories / activeTargetCalories) * 100)}%` }}
              />
            </div>
          </div>

          {/* Desglose de Macronutrientes */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--glass-border)]">
            {/* Proteína */}
            <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Proteína</span>
              <div className="text-base font-bold text-rose-500 font-mono data-tabular my-0.5">{activeTotals.protein_g}g</div>
              <div className="w-full bg-[var(--glass-surface-thick)] h-1 rounded-full overflow-hidden my-1">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeTotals.protein_g / targetProtein) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-[var(--text-tertiary)] font-mono">Meta {targetProtein}g</span>
            </div>

            {/* Carbohidratos */}
            <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Carbos</span>
              <div className="text-base font-bold text-amber-500 font-mono data-tabular my-0.5">{activeTotals.carbs_g}g</div>
              <div className="w-full bg-[var(--glass-surface-thick)] h-1 rounded-full overflow-hidden my-1">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeTotals.carbs_g / targetCarbs) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-[var(--text-tertiary)] font-mono">Meta {targetCarbs}g</span>
            </div>

            {/* Grasas */}
            <div className="p-3 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-center">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Grasas</span>
              <div className="text-base font-bold text-emerald-500 font-mono data-tabular my-0.5">{activeTotals.fat_g}g</div>
              <div className="w-full bg-[var(--glass-surface-thick)] h-1 rounded-full overflow-hidden my-1">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeTotals.fat_g / targetFat) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-[var(--text-tertiary)] font-mono">Meta {targetFat}g</span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: HIDRATACIÓN & CREATINA */}
        <div className="space-y-4">
          {/* CONTROL DE AGUA E HIDRATACIÓN */}
          <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Droplet className="w-4 h-4 fill-blue-500/30" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider editorial-heading">
                    Hidratación Diaria
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono data-tabular">
                    {(activeTotals.water_ml / 1000).toFixed(2)}L de {(activeTargetWater / 1000).toFixed(1)}L objetivo
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-blue-500 data-tabular">
                {Math.min(100, Math.round((activeTotals.water_ml / activeTargetWater) * 100))}%
              </span>
            </div>

            <div className="w-full bg-[var(--glass-surface-thick)] h-2 rounded-full overflow-hidden border border-[var(--glass-border)]">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.water_ml / activeTargetWater) * 100)}%` }}
              />
            </div>

            {/* Botones de suma rápida de agua */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => onAddWater(-250, selectedDate)}
                className="py-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] apple-btn-spring transition-all font-mono"
                title="Restar 250ml"
              >
                -250 ml
              </button>
              <button
                onClick={() => onAddWater(250, selectedDate)}
                className="py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs font-bold text-blue-500 hover:text-blue-400 apple-btn-spring transition-all font-mono"
              >
                +250 ml
              </button>
              <button
                onClick={() => onAddWater(500, selectedDate)}
                className="py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs font-bold text-blue-500 hover:text-blue-400 apple-btn-spring transition-all font-mono"
              >
                +500 ml
              </button>
              <button
                onClick={() => onAddWater(1000, selectedDate)}
                className="py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs font-bold text-blue-500 hover:text-blue-400 apple-btn-spring transition-all font-mono"
              >
                +1.0 L
              </button>
            </div>
          </div>

          {/* TRACKER DE CREATINA */}
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between transition-all duration-300 ${
              creatineTaken
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                : 'liquid-glass-card text-[var(--text-secondary)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                  creatineTaken ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--glass-surface)] text-[var(--text-tertiary)]'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">Creatina Monohidrato (5g)</div>
                <div className="text-[10px] text-[var(--text-secondary)]">Saturación celular y fuerza</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                {creatineTaken ? 'Tomada' : 'Pendiente'}
              </span>
              <AppleSwitch
                checked={creatineTaken}
                onChange={handleToggleCreatine}
                size="sm"
                activeColor="emerald"
                aria-label="Alternar ingesta de creatina"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* FEEDBACK TOAST / ESTADO DE LOTE                                   */}
      {/* ================================================================ */}
      {batchToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{batchToast}</span>
          </div>
          <button
            onClick={() => setBatchToast(null)}
            className="text-[10px] text-emerald-600/70 hover:text-emerald-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* PLANTILLAS EN BLOQUE Y BOTÓN DÍA TÍPICO CUMPLIDO (P1.3)           */}
      {/* ================================================================ */}
      <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D97757]/15 text-[#D97757] flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider editorial-heading">
                Nutrición Rápida en Bloque
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                2.400 kcal • 202g Proteína (4 tomas)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            1-Tap
          </span>
        </div>

        {/* Botón Principal: Día Típico Cumplido */}
        <button
          onClick={handleTypicalDayClick}
          disabled={isApplyingBatch}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#D97757] to-[#E28464] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#D97757]/20 apple-btn-spring transition-all disabled:opacity-50"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>
            {isApplyingBatch
              ? 'Registrando día completo...'
              : `Marcar Día Típico Cumplido (2.400 kcal)`}
          </span>
        </button>

        {/* Atajos 1-Tap de tomas individuales de la plantilla */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider block">
              Bloques Frecuentes Mercadona (1-Tap):
            </span>
            <button
              onClick={() => setShowPresetsModal(true)}
              className="text-[10px] text-[#D97757] hover:underline font-bold"
            >
              Ver todas ({FREQUENT_MEAL_PRESETS.length}) &rarr;
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FREQUENT_MEAL_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleAddPresetMeal(preset)}
                className="p-2.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-left hover:border-[#D97757]/40 apple-btn-spring transition-all group flex flex-col justify-between"
                title={`Añadir ${preset.name}`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                  <span className="truncate pr-1">{preset.name}</span>
                  <span className="text-[10px] font-mono text-[#D97757] font-bold">+{preset.calories}k</span>
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono data-tabular">
                  {preset.protein_g}g P • {preset.carbs_g}g C
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTADO DE COMIDAS REGISTRADAS */}
      <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] editorial-heading">
            Comidas Registradas ({displayedMeals.length})
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono data-tabular">
            {selectedDate === todayStr ? 'Hoy' : selectedDate}
          </span>
        </div>

        {displayedMeals.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
            Sin comidas registradas aún para este día. Usa el botón de voz o añade una manual.
          </p>
        ) : (
          <div className="space-y-2">
            {displayedMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-3.5 rounded-2xl bg-[var(--glass-surface)] border border-[var(--glass-border)] space-y-1.5 hover:border-[#D97757]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--glass-surface-thick)] text-[var(--text-primary)] font-bold">
                    {meal.meal_type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono data-tabular">
                      {meal.calories} kcal
                    </span>
                    {onDeleteMeal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar "${meal.description?.slice(0, 35)}..."?`)) {
                            onDeleteMeal(meal.id);
                          }
                        }}
                        className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 active:scale-90 transition-all"
                        title="Eliminar comida"
                        aria-label="Eliminar comida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                  {meal.description}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-mono data-tabular">
                  <span>
                    P: <strong className="text-rose-500">{meal.protein_g}g</strong>
                  </span>
                  <span>
                    C: <strong className="text-amber-500">{meal.carbs_g}g</strong>
                  </span>
                  <span>
                    G: <strong className="text-emerald-500">{meal.fat_g}g</strong>
                  </span>
                  {meal.raw_audio_transcription && (
                    <span className="text-blue-500 ml-auto text-[9px] flex items-center gap-0.5 font-sans">
                      <Mic className="w-3 h-3" /> Audio
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BASE DE DATOS DE ALIMENTOS HABITUALES (ACORDEÓN) */}
      <div className="liquid-glass-card p-5 sm:p-6 rounded-3xl space-y-3">
        <button
          onClick={() => setShowFrequentFoods(!showFrequentFoods)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#D97757]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Alimentos Habituales ({Object.keys(initialFrequentFoods).length})
            </h3>
          </div>
          {showFrequentFoods ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </button>

        {showFrequentFoods && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--glass-border)]">
            {Object.entries(initialFrequentFoods).map(([key, food]) => (
              <div
                key={key}
                className="p-2.5 rounded-2xl liquid-glass-pill text-[11px] space-y-1"
              >
                <div className="font-bold text-[var(--text-primary)]">{food.name}</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
                  <span className="text-[#D97757] font-bold">{food.calories} kcal</span>
                  <span>P: {food.protein_g}g</span>
                  <span>C: {food.carbs_g}g</span>
                  <span>G: {food.fat_g}g</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE AJUSTES DE PROTOCOLO */}
      {showProtocolModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm liquid-glass-card bg-[var(--glass-surface-thick)] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#D97757]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Ajustes de Protocolo
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D97757]/15 text-[#D97757] font-bold">
                Álvaro
              </span>
            </div>

            <form onSubmit={handleSaveProtocol} className="space-y-3">
              {/* Peso corporal */}
              <div>
                <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Peso Corporal (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => {
                    const w = parseFloat(e.target.value);
                    setWeightKg(w);
                    if (!isNaN(w) && w > 0) {
                      setTargetProtein(Math.round(w * 1.7));
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                  required
                />
              </div>

              {/* Estrategia del día */}
              <div>
                <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Estrategia del Día</label>
                <select
                  value={dayType}
                  onChange={(e) => {
                    const dt = e.target.value as DayType;
                    setDayTypeState(dt);
                    if (dt === 'strength') {
                      setTargetCalories(2380);
                      setTargetCarbs(270);
                    } else if (dt === 'running') {
                      setTargetCalories(2400);
                      setTargetCarbs(280);
                    } else {
                      setTargetCalories(2500);
                      setTargetCarbs(230);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-semibold outline-none"
                >
                  <option value="running">Running / Carrera (Hidratos altos 260-280g)</option>
                  <option value="strength">Pierna / Fuerza (Déficit óptimo 2.380 kcal)</option>
                  <option value="rest_refeed">Descanso Activo / Refeed (~2.500 kcal)</option>
                </select>
              </div>

              {/* Calorías objetivo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
              </div>

              {/* Carbos y Grasas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={targetCarbs}
                    onChange={(e) => setTargetCarbs(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={targetFat}
                    onChange={(e) => setTargetFat(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
              </div>

              {/* Agua diaria */}
              <div>
                <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Objetivo Agua (ml)</label>
                <input
                  type="number"
                  step="250"
                  value={targetWater}
                  onChange={(e) => setTargetWater(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProtocolModal(false)}
                  className="flex-1 py-2.5 rounded-xl liquid-glass-pill text-[var(--text-secondary)] font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D97757] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#D97757]/20 active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANUAL PARA AÑADIR COMIDA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm liquid-glass-card bg-[var(--glass-surface-thick)] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Añadir Comida Manual
            </h3>

            <form onSubmit={handleSaveMeal} className="space-y-3">
              <div>
                <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Tipo de Comida</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-semibold outline-none"
                >
                  <option value="Desayuno">Desayuno</option>
                  <option value="Almuerzo">Almuerzo</option>
                  <option value="Cena">Cena</option>
                  <option value="Snack">Snack / Merienda</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Descripción de alimentos</label>
                <input
                  type="text"
                  placeholder="Ej: Bol de avena con leche, yogur griego y whey"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs outline-none focus:border-[#D97757]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[var(--glass-surface)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl liquid-glass-pill text-[var(--text-secondary)] font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#D97757] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#D97757]/20 active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: DÍA TÍPICO CUMPLIDO */}
      {showTypicalConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm liquid-glass-card bg-[var(--glass-surface-thick)] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D97757]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Confirmar Día Típico
                </h3>
              </div>
              <button
                onClick={() => setShowTypicalConfirm(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--text-primary)] font-medium">
                Ya tienes <strong className="text-[#D97757]">{displayedMeals.length}</strong> tomas registradas en {selectedDate === todayStr ? 'el día de hoy' : selectedDate}:
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {displayedMeals.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-lg liquid-glass-pill text-[10px] font-mono text-[var(--text-secondary)]"
                  >
                    {m.meal_type}: {m.calories} kcal
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {missingTypicalMeals.length > 0 ? (
                <button
                  onClick={() => handleExecuteBatch(missingTypicalMeals)}
                  disabled={isApplyingBatch}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#D97757] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#D97757]/20 active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Añadir solo las {missingTypicalMeals.length} tomas pendientes (Recomendado)</span>
                </button>
              ) : (
                <p className="text-[11px] text-emerald-500 font-semibold text-center">
                  ¡Todas las 4 tomas de la rutina ya están registradas!
                </p>
              )}

              <button
                onClick={() => handleExecuteBatch(typicalMealsForDay)}
                disabled={isApplyingBatch}
                className="w-full py-2.5 px-3 rounded-xl liquid-glass-pill text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-1.5 hover:border-[#D97757]/40 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir las 4 tomas completas (+2.400 kcal)</span>
              </button>

              <button
                onClick={() => setShowTypicalConfirm(false)}
                className="w-full py-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELECTOR DE PLANTILLAS FRECUENTES (8 BLOQUES) */}
      {showPresetsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md liquid-glass-card bg-[var(--glass-surface-thick)] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#D97757]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Plantillas de Comidas Frecuentes
                </h3>
              </div>
              <button
                onClick={() => setShowPresetsModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas de categoría */}
            <div className="flex gap-1 p-1 liquid-glass-pill text-[11px] font-bold">
              {(['Todos', 'Desayuno', 'Almuerzo', 'Merienda', 'Cena'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedPresetTab(tab)}
                  className={`flex-1 py-1 rounded-lg text-center transition-all ${
                    selectedPresetTab === tab
                      ? 'bg-[#D97757] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Listado de bloques frecuentes */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-2xl liquid-glass-pill space-y-2 border border-[var(--glass-border)] hover:border-[#D97757]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--glass-border-subtle)] text-[var(--text-primary)] font-bold mr-2">
                        {preset.meal_type}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {preset.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#D97757]">
                      {preset.calories} kcal
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
                      <span>P: <strong className="text-rose-500">{preset.protein_g}g</strong></span>
                      <span>C: <strong className="text-amber-500">{preset.carbs_g}g</strong></span>
                      <span>G: <strong className="text-emerald-500">{preset.fat_g}g</strong></span>
                    </div>
                    <button
                      onClick={async () => {
                        await handleAddPresetMeal(preset);
                        setShowPresetsModal(false);
                      }}
                      className="py-1 px-2.5 rounded-xl bg-[#D97757] text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm shadow-[#D97757]/20"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      Añadir a {selectedDate === todayStr ? 'Hoy' : selectedDate}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
