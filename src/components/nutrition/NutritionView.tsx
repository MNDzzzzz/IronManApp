'use client';

import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Droplet,
  Plus,
  Minus,
  Trash2,
  Mic,
  Sparkles,
  Flame,
  Check,
  ChevronRight,
  Settings2,
  Calendar,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NutritionLog, WaterLog } from '@/types/database';
import { initialFrequentFoods, DayType } from '@/lib/nutritionProtocol';
import { getTodayRoutine, getSpainDate } from '@/lib/weeklyRoutine';

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
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  meals,
  waterLogs,
  totals,
  onAddWater,
  onDeleteWater,
  onAddMeal,
  onDeleteMeal,
}) => {
  // Fecha seleccionada (por defecto hoy, con opción de ver ayer Martes 22 y Miércoles 23)
  const todayStr = new Date().toISOString().split('T')[0];
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

  // Lista dinámica de fechas disponibles (registros reales + ventana temporal)
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();

    // 1. Todas las fechas que tengan comidas o agua registradas
    meals.forEach((m) => {
      if (m.date) datesSet.add(m.date);
    });
    waterLogs.forEach((w) => {
      if (w.date) datesSet.add(w.date);
    });

    // 2. Ventana continua desde inicio del plan hasta hoy + 1 día
    const today = new Date();
    const start = new Date('2026-09-21T12:00:00');
    const end = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);

    const curr = new Date(start);
    while (curr <= end) {
      datesSet.add(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    datesSet.add(todayStr);
    datesSet.add(selectedDate);

    return Array.from(datesSet).sort();
  }, [meals, waterLogs, todayStr, selectedDate]);

  // Objetivos nutricionales adaptados al día seleccionado
  const activeTargetCalories = currentRoutine?.nutritionStrategy?.calorieTarget || targetCalories;
  const activeTargetWater = Math.round((currentRoutine?.nutritionStrategy?.waterLiters || 3.8) * 1000);

  // Filtrar comidas e hidratación para la fecha seleccionada
  const displayedMeals = useMemo(() => {
    return meals.filter((m) => m.date === selectedDate);
  }, [meals, selectedDate]);

  const displayedWater = useMemo(() => {
    return waterLogs.filter((w) => w.date === selectedDate);
  }, [waterLogs, selectedDate]);

  // Recalcular totales para la fecha seleccionada
  const activeTotals = useMemo(() => {
    const kcal = displayedMeals.reduce((sum, m) => sum + m.calories, 0);
    const prot = displayedMeals.reduce((sum, m) => sum + m.protein_g, 0);
    const c = displayedMeals.reduce((sum, m) => sum + m.carbs_g, 0);
    const f = displayedMeals.reduce((sum, m) => sum + m.fat_g, 0);
    const water = displayedWater.reduce((sum, w) => sum + w.amount_ml, 0);
    return {
      calories: kcal,
      protein_g: Number(prot.toFixed(1)),
      carbs_g: Number(c.toFixed(1)),
      fat_g: Number(f.toFixed(1)),
      water_ml: water,
    };
  }, [displayedMeals, displayedWater]);

  // Alternar creatina
  const handleToggleCreatine = async () => {
    const nextState = !creatineTaken;
    setCreatineTaken(nextState);
    try {
      await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatine_taken: nextState }),
      });
    } catch (e) {
      console.error('Error guardando creatina:', e);
    }
  };

  // Guardar cambios de protocolo
  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: weightKg,
          day_type: dayType,
          targets: {
            calories: targetCalories,
            proteinMin: targetProtein - 10,
            proteinMax: targetProtein + 10,
            carbsMin: targetCarbs - 20,
            carbsMax: targetCarbs + 20,
            fatMin: targetFat - 5,
            fatMax: targetFat + 5,
            waterMl: targetWater,
          },
        }),
      });
      setShowProtocolModal(false);
    } catch (e) {
      console.error('Error guardando protocolo:', e);
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    setIsSubmitting(true);
    try {
      await onAddMeal({
        date: selectedDate,
        meal_type: mealType,
        description,
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
    <div className="space-y-4 pb-24 px-4 pt-2">
      {/* CABECERA Y BOTONES DE ACCIÓN */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Dieta & Nutrición</h1>
          <p className="text-xs text-zinc-400">
            Protocolo Maratón + Fuerza • <span className="text-orange-400 font-bold">{weightKg} kg</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowProtocolModal(true)}
            className="p-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all hover:bg-zinc-800"
            title="Ajustar protocolo y objetivos"
          >
            <Settings2 className="w-4 h-4 text-orange-400" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 px-3 rounded-2xl bg-orange-500 text-black font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
      </div>

      {/* SELECTOR DINÁMICO DE FECHAS (HISTÓRICO Y RUTINAS) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            Calendario & Rutina
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">
              {selectedDate === todayStr ? 'Hoy' : selectedDate}
            </span>
            <label className="relative p-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Seleccionar otra fecha"
              />
              <Calendar className="w-3 h-3 text-orange-400" />
              <span>Elegir fecha</span>
            </label>
          </div>
        </div>

        {/* Tira deslizable de días */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-950 border border-zinc-900 rounded-2xl overflow-x-auto scrollbar-thin">
          {availableDates.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const isToday = dStr === todayStr;
            const routine = getTodayRoutine(dStr);
            const dObj = new Date(dStr + 'T12:00:00');
            const dayOfWeek = dObj.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = dObj.getDate();
            const hasMeals = meals.some((m) => m.date === dStr);
            const hasWater = waterLogs.some((w) => w.date === dStr);

            // Etiqueta breve según la rutina
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
                className={`py-1.5 px-3 rounded-xl text-center transition-all whitespace-nowrap flex flex-col items-center min-w-[68px] relative ${
                  isSelected
                    ? 'bg-orange-500 text-black shadow-md font-black ring-1 ring-orange-400'
                    : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] leading-tight">
                  <span className="capitalize font-bold">{dayOfWeek}</span>
                  <span className="font-mono text-xs">{dayNum}</span>
                </div>
                <span
                  className={`text-[9px] mt-0.5 px-1 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-black/20 text-black'
                      : routine.category === 'Fuerza'
                      ? 'text-orange-400'
                      : routine.category === 'Cardio'
                      ? 'text-blue-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {isToday ? 'Hoy' : badgeText}
                </span>

                {(hasMeals || hasWater) && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${
                      isSelected ? 'bg-black' : 'bg-emerald-400'
                    }`}
                    title="Tiene registros"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FICHA OFICIAL DEL DÍA (ESTRATEGIA NUTRICIONAL Y HORARIO) */}
      <div className="p-3.5 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                currentRoutine.category === 'Fuerza'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : currentRoutine.category === 'Cardio'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {currentRoutine.category}
            </span>
            <span className="text-xs font-bold text-white">
              {currentRoutine.dayName} • {currentRoutine.title}
            </span>
          </div>
          <span className="text-[10px] font-bold text-orange-400 font-mono">
            {activeTargetCalories} kcal
          </span>
        </div>

        <p className="text-[11px] text-zinc-300 leading-snug">
          {currentRoutine.nutritionStrategy.guidelines}
        </p>

        {/* Resumen de objetivos prescritos */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] text-zinc-400 font-mono">
          <div className="bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 text-center">
            <span className="text-[9px] text-zinc-500 block">Kcal</span>
            <span className="font-bold text-white">{activeTargetCalories}</span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 text-center">
            <span className="text-[9px] text-zinc-500 block">Proteína</span>
            <span className="font-bold text-rose-400">{currentRoutine.nutritionStrategy.proteinTarget.split(' ')[0]}</span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 text-center">
            <span className="text-[9px] text-zinc-500 block">Carbos</span>
            <span className="font-bold text-amber-400">{currentRoutine.nutritionStrategy.carbsTarget.split(' ')[0]}</span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80 text-center">
            <span className="text-[9px] text-zinc-500 block">Agua</span>
            <span className="font-bold text-blue-400">{currentRoutine.nutritionStrategy.waterLiters}L</span>
          </div>
        </div>

        {/* Menú estructurado recomendado de 4 tomas */}
        {currentRoutine.nutritionStrategy.recommendedMeals?.length > 0 && (
          <div className="pt-1 border-t border-zinc-900">
            <button
              onClick={() => setShowRecommendedMenu(!showRecommendedMenu)}
              className="w-full flex items-center justify-between text-left text-[11px] text-orange-400 hover:text-orange-300 font-semibold py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" />
                {showRecommendedMenu ? 'Ocultar menú sugerido' : 'Ver menú sugerido de 4 tomas'}
              </span>
              {showRecommendedMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRecommendedMenu && (
              <div className="space-y-2 pt-2">
                {currentRoutine.nutritionStrategy.recommendedMeals.map((meal, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-300 text-[11px] uppercase tracking-wider">
                        {meal.slot}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{meal.details}</span>
                    </div>
                    <p className="text-zinc-200 text-[11px] leading-relaxed">{meal.dish}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PILL DE CREATINA Y BANNER TELEGRAM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Tracker de Creatina Monohidrato */}
        <button
          onClick={handleToggleCreatine}
          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
            creatineTaken
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                creatineTaken ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white">Creatina (5g)</div>
              <div className="text-[9px] text-zinc-400">Merienda con Avena + Whey</div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              creatineTaken
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {creatineTaken ? 'Tomada' : 'Pendiente'}
          </span>
        </button>

        {/* Telegram Audio Helper */}
        <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white">Bot de Telegram Activo</div>
              <div className="text-[9px] text-zinc-400">Envía audio o escribe /resumen</div>
            </div>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            IA 1.5
          </span>
        </div>
      </div>

      {/* TARJETA DE CALORÍAS Y MACRONUTRIENTES */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-4">
        {/* Calorías totales */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Calorías ({selectedDate})</span>
            <div className="text-2xl font-black text-white">
              {activeTotals.calories} <span className="text-xs font-normal text-zinc-400">/ {activeTargetCalories} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-zinc-400">Restante</span>
            <div className="text-base font-bold text-orange-400">
              {Math.max(0, activeTargetCalories - activeTotals.calories)} kcal
            </div>
          </div>
        </div>

        {/* Desglose de Macronutrientes */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900">
          {/* Proteína */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Proteína</span>
              <span className="font-bold text-rose-400">{activeTotals.protein_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.protein_g / targetProtein) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block">Meta: {targetProtein}g</span>
          </div>

          {/* Carbohidratos */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Carbos</span>
              <span className="font-bold text-amber-400">{activeTotals.carbs_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.carbs_g / targetCarbs) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block">Meta: {targetCarbs}g</span>
          </div>

          {/* Grasas */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Grasas</span>
              <span className="font-bold text-emerald-400">{activeTotals.fat_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.fat_g / targetFat) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block">Meta: {targetFat}g</span>
          </div>
        </div>
      </div>

      {/* CONTROL DE AGUA E HIDRATACIÓN */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Droplet className="w-4 h-4 fill-blue-400/40" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hidratación Diaria</h3>
              <p className="text-[10px] text-zinc-500">
                {(activeTotals.water_ml / 1000).toFixed(2)}L de {(activeTargetWater / 1000).toFixed(1)}L objetivo
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {Math.min(100, Math.round((activeTotals.water_ml / activeTargetWater) * 100))}%
          </span>
        </div>

        <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (activeTotals.water_ml / activeTargetWater) * 100)}%` }}
          />
        </div>

        {/* Botones de suma y resta rápida */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => onAddWater(-250, selectedDate)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
            title="Restar 250ml"
          >
            -250 ml
          </button>
          <button
            onClick={() => onAddWater(250, selectedDate)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +250 ml
          </button>
          <button
            onClick={() => onAddWater(500, selectedDate)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +500 ml
          </button>
          <button
            onClick={() => onAddWater(1000, selectedDate)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +1.0L
          </button>
        </div>

        {/* Listado de tomas individuales de agua para la fecha seleccionada */}
        {displayedWater.length > 0 && (
          <div className="pt-2 border-t border-zinc-900/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Tomas registradas ({displayedWater.length})</span>
              <span className="font-mono">{displayedWater.reduce((s, w) => s + w.amount_ml, 0)} ml total</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedWater.map((w) => (
                <div
                  key={w.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300"
                >
                  <span className="font-medium text-blue-300">+{w.amount_ml} ml</span>
                  {onDeleteWater && (
                    <button
                      onClick={() => onDeleteWater(w.id)}
                      className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Eliminar esta toma"
                      aria-label="Eliminar toma"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LISTADO DE COMIDAS REGISTRADAS */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Comidas ({displayedMeals.length}) • {selectedDate}
        </h3>
        {displayedMeals.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">
            No hay comidas registradas para este día. ¡Envía un audio a Telegram o pulsa &quot;+ Añadir&quot;!
          </p>
        ) : (
          <div className="space-y-2">
            {displayedMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1.5 hover:border-zinc-700/60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
                    {meal.meal_type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{meal.calories} kcal</span>
                    {onDeleteMeal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar "${meal.description.slice(0, 35)}..."?`)) {
                            onDeleteMeal(meal.id);
                          }
                        }}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all"
                        title="Eliminar comida"
                        aria-label="Eliminar comida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-200 font-medium">{meal.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                  <span>
                    P: <strong className="text-rose-400">{meal.protein_g}g</strong>
                  </span>
                  <span>
                    C: <strong className="text-amber-400">{meal.carbs_g}g</strong>
                  </span>
                  <span>
                    G: <strong className="text-emerald-400">{meal.fat_g}g</strong>
                  </span>
                  {meal.raw_audio_transcription && (
                    <span className="text-blue-400 ml-auto text-[9px] flex items-center gap-0.5">
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
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
        <button
          onClick={() => setShowFrequentFoods(!showFrequentFoods)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Alimentos Habituales Registrados ({Object.keys(initialFrequentFoods).length})
            </h3>
          </div>
          {showFrequentFoods ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {showFrequentFoods && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
            {Object.entries(initialFrequentFoods).map(([key, food]) => (
              <div
                key={key}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] space-y-1"
              >
                <div className="font-bold text-white">{food.name}</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <span className="text-orange-400 font-bold">{food.calories} kcal</span>
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ajustes de Protocolo</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold">
                Álvaro
              </span>
            </div>

            <form onSubmit={handleSaveProtocol} className="space-y-3">
              {/* Peso corporal */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Peso Corporal (kg)</label>
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
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                  required
                />
                <span className="text-[9px] text-zinc-500 mt-0.5 block">
                  Proteína calculada a ~1.7g/kg: {Math.round(weightKg * 1.65)} - {Math.round(weightKg * 1.85)}g
                </span>
              </div>

              {/* Estrategia del día */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Estrategia del Día</label>
                <select
                  value={dayType}
                  onChange={(e: any) => {
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
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="running">Running / Carrera (Hidratos altos 260-280g)</option>
                  <option value="strength">Pierna / Fuerza (Déficit óptimo 2.350 kcal)</option>
                  <option value="rest_refeed">Descanso Activo / Refeed (~2.500 kcal)</option>
                </select>
              </div>

              {/* Calorías objetivo */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {/* Carbos y Grasas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={targetCarbs}
                    onChange={(e) => setTargetCarbs(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={targetFat}
                    onChange={(e) => setTargetFat(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {/* Agua diaria */}
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Objetivo Agua (ml)</label>
                <input
                  type="number"
                  step="250"
                  value={targetWater}
                  onChange={(e) => setTargetWater(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProtocolModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20"
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Añadir Comida Manual</h3>

            <form onSubmit={handleSaveMeal} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Tipo de Comida</label>
                <select
                  value={mealType}
                  onChange={(e: any) => setMealType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="Desayuno">Desayuno</option>
                  <option value="Almuerzo">Almuerzo</option>
                  <option value="Cena">Cena</option>
                  <option value="Snack">Snack / Merienda</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Descripción de alimentos</label>
                <input
                  type="text"
                  placeholder="Ej: Bol de avena con leche, yogur griego y whey"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
