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
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 px-3.5 pt-1 font-sans animate-in fade-in duration-300">
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

      {/* FICHA OFICIAL DEL DÍA */}
      <div className="p-4 rounded-3xl liquid-glass-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                currentRoutine.category === 'Fuerza'
                  ? 'bg-[#2D68C4]/15 text-[#2D68C4] border border-[#2D68C4]/30'
                  : currentRoutine.category === 'Cardio'
                  ? 'bg-[#FC5200]/15 text-[#FC5200] border border-[#FC5200]/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {currentRoutine.category}
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {currentRoutine.dayName} • {currentRoutine.title}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#D97757] font-mono">
            {activeTargetCalories} kcal
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
          {currentRoutine.nutritionStrategy.guidelines}
        </p>

        {/* Resumen de objetivos prescritos */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] text-[var(--text-secondary)] font-mono">
          <div className="p-1.5 rounded-2xl liquid-glass-pill text-center">
            <span className="text-[9px] text-[var(--text-tertiary)] block">Kcal</span>
            <span className="font-bold text-[var(--text-primary)]">{activeTargetCalories}</span>
          </div>
          <div className="p-1.5 rounded-2xl liquid-glass-pill text-center">
            <span className="text-[9px] text-[var(--text-tertiary)] block">Proteína</span>
            <span className="font-bold text-rose-500">{currentRoutine.nutritionStrategy.proteinTarget.split(' ')[0]}</span>
          </div>
          <div className="p-1.5 rounded-2xl liquid-glass-pill text-center">
            <span className="text-[9px] text-[var(--text-tertiary)] block">Carbos</span>
            <span className="font-bold text-amber-500">{currentRoutine.nutritionStrategy.carbsTarget.split(' ')[0]}</span>
          </div>
          <div className="p-1.5 rounded-2xl liquid-glass-pill text-center">
            <span className="text-[9px] text-[var(--text-tertiary)] block">Agua</span>
            <span className="font-bold text-blue-500">{currentRoutine.nutritionStrategy.waterLiters}L</span>
          </div>
        </div>

        {/* Menú estructurado recomendado de 4 tomas */}
        {currentRoutine.nutritionStrategy.recommendedMeals?.length > 0 && (
          <div className="pt-1 border-t border-[var(--glass-border)]">
            <button
              onClick={() => setShowRecommendedMenu(!showRecommendedMenu)}
              className="w-full flex items-center justify-between text-left text-[11px] text-[#D97757] font-semibold py-1 transition-colors"
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
                    className="p-2.5 rounded-2xl liquid-glass-pill text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#D97757] text-[11px] uppercase tracking-wider">
                        {meal.slot}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{meal.details}</span>
                    </div>
                    <p className="text-[var(--text-primary)] text-[11px] leading-relaxed">{meal.dish}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PILL DE CREATINA Y ESTADO COACH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Tracker de Creatina */}
        <button
          onClick={handleToggleCreatine}
          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
            creatineTaken
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
              : 'liquid-glass-card text-[var(--text-secondary)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                creatineTaken ? 'bg-emerald-500/20 text-emerald-500' : 'liquid-glass-pill text-[var(--text-tertiary)]'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[var(--text-primary)]">Creatina (5g)</div>
              <div className="text-[9px] text-[var(--text-secondary)]">Merienda con Avena + Whey</div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              creatineTaken
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                : 'liquid-glass-pill text-[var(--text-secondary)]'
            }`}
          >
            {creatineTaken ? 'Tomada' : 'Pendiente'}
          </span>
        </button>

        {/* Telegram Audio Helper */}
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[var(--text-primary)]">Dictado por Voz Activo</div>
              <div className="text-[9px] text-[var(--text-secondary)]">Habla en el Hub o vía Telegram</div>
            </div>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30 font-mono">
            Whisper
          </span>
        </div>
      </div>

      {/* TARJETA DE CALORÍAS Y MACRONUTRIENTES */}
      <div className="p-4 rounded-3xl liquid-glass-card space-y-4">
        {/* Calorías totales */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Calorías ({selectedDate})</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">
              {activeTotals.calories}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">/ {activeTargetCalories} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Restante</span>
            <div className="text-base font-bold text-[#D97757] font-mono">
              {Math.max(0, activeTargetCalories - activeTotals.calories)} kcal
            </div>
          </div>
        </div>

        {/* Desglose de Macronutrientes */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--glass-border)]">
          {/* Proteína */}
          <div className="p-2.5 rounded-2xl liquid-glass-pill">
            <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] mb-1">
              <span>Proteína</span>
              <span className="font-bold text-rose-500 font-mono">{activeTotals.protein_g}g</span>
            </div>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.protein_g / targetProtein) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-1 block">Meta: {targetProtein}g</span>
          </div>

          {/* Carbohidratos */}
          <div className="p-2.5 rounded-2xl liquid-glass-pill">
            <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] mb-1">
              <span>Carbos</span>
              <span className="font-bold text-amber-500 font-mono">{activeTotals.carbs_g}g</span>
            </div>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.carbs_g / targetCarbs) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-1 block">Meta: {targetCarbs}g</span>
          </div>

          {/* Grasas */}
          <div className="p-2.5 rounded-2xl liquid-glass-pill">
            <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] mb-1">
              <span>Grasas</span>
              <span className="font-bold text-emerald-500 font-mono">{activeTotals.fat_g}g</span>
            </div>
            <div className="w-full bg-[var(--glass-border-subtle)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeTotals.fat_g / targetFat) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-1 block">Meta: {targetFat}g</span>
          </div>
        </div>
      </div>

      {/* CONTROL DE AGUA E HIDRATACIÓN */}
      <div className="p-4 rounded-3xl liquid-glass-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Droplet className="w-4 h-4 fill-blue-500/40" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Hidratación Diaria
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                {(activeTotals.water_ml / 1000).toFixed(2)}L de {(activeTargetWater / 1000).toFixed(1)}L objetivo
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-500">
            {Math.min(100, Math.round((activeTotals.water_ml / activeTargetWater) * 100))}%
          </span>
        </div>

        <div className="w-full bg-[var(--glass-border-subtle)] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (activeTotals.water_ml / activeTargetWater) * 100)}%` }}
          />
        </div>

        {/* Botones de suma rápida */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => onAddWater(-250, selectedDate)}
            className="py-2 rounded-xl liquid-glass-pill text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
            title="Restar 250ml"
          >
            -250 ml
          </button>
          <button
            onClick={() => onAddWater(250, selectedDate)}
            className="py-2 rounded-xl liquid-glass-pill text-xs font-bold text-blue-500 hover:text-blue-600 active:scale-95 transition-all"
          >
            +250 ml
          </button>
          <button
            onClick={() => onAddWater(500, selectedDate)}
            className="py-2 rounded-xl liquid-glass-pill text-xs font-bold text-blue-500 hover:text-blue-600 active:scale-95 transition-all"
          >
            +500 ml
          </button>
          <button
            onClick={() => onAddWater(1000, selectedDate)}
            className="py-2 rounded-xl liquid-glass-pill text-xs font-bold text-blue-500 hover:text-blue-600 active:scale-95 transition-all"
          >
            +1.0L
          </button>
        </div>

        {/* Listado de tomas individuales de agua */}
        {displayedWater.length > 0 && (
          <div className="pt-2 border-t border-[var(--glass-border)] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>Tomas registradas ({displayedWater.length})</span>
              <span className="font-mono">{displayedWater.reduce((s, w) => s + w.amount_ml, 0)} ml total</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedWater.map((w) => (
                <div
                  key={w.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl liquid-glass-pill text-[11px] text-[var(--text-primary)]"
                >
                  <span className="font-medium text-blue-500">+{w.amount_ml} ml</span>
                  {onDeleteWater && (
                    <button
                      onClick={() => onDeleteWater(w.id)}
                      className="text-[var(--text-tertiary)] hover:text-rose-500 p-0.5 rounded transition-colors"
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
      <div className="p-4 rounded-3xl liquid-glass-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Comidas ({displayedMeals.length}) • {selectedDate}
        </h3>
        {displayedMeals.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
            No hay comidas registradas para este día. ¡Usa el botón de voz en la pantalla principal o añade una manual!
          </p>
        ) : (
          <div className="space-y-2">
            {displayedMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-3 rounded-2xl liquid-glass-pill space-y-1.5 hover:border-[#D97757]/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--glass-border-subtle)] text-[var(--text-primary)] font-bold">
                    {meal.meal_type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
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
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] font-mono">
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
                    <span className="text-blue-500 ml-auto text-[9px] flex items-center gap-0.5">
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
      <div className="p-4 rounded-3xl liquid-glass-card space-y-3">
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
    </div>
  );
};
