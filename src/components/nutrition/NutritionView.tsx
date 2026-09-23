'use client';

import React, { useState } from 'react';
import {
  Utensils,
  Droplet,
  Plus,
  Mic,
  Sparkles,
  Flame,
  Check,
  ChevronRight,
} from 'lucide-react';
import { NutritionLog, WaterLog } from '@/types/database';

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
  onAddWater: (amountMl: number) => Promise<void>;
  onAddMeal: (mealData: Partial<NutritionLog>) => Promise<void>;
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  meals,
  waterLogs,
  totals,
  onAddWater,
  onAddMeal,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [mealType, setMealType] = useState<'Desayuno' | 'Almuerzo' | 'Cena' | 'Snack'>('Almuerzo');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('550');
  const [protein, setProtein] = useState('40');
  const [carbs, setCarbs] = useState('50');
  const [fat, setFat] = useState('18');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Objetivos diarios típicos para atleta
  const targetCalories = 2400;
  const targetProtein = 160;
  const targetCarbs = 260;
  const targetFat = 70;
  const targetWater = 3000;

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    setIsSubmitting(true);
    try {
      await onAddMeal({
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Dieta & Nutrición</h1>
          <p className="text-xs text-zinc-400">Recuento diario y registro de agua por voz</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 rounded-2xl bg-orange-500 text-black font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Añadir
        </button>
      </div>

      {/* BANNER ASISTENTE DE VOZ TELEGRAM */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-950/40 via-zinc-950 to-zinc-950 border border-blue-900/40 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Asistente por Voz de Telegram</h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">IA ACTIVA</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Envíale un audio a tu bot diciendo lo que has comido y cuánto has bebido. La IA extraerá los macros y los sumará aquí al instante.
            </p>
          </div>
        </div>
      </div>

      {/* TARJETA DE CALORÍAS Y MACRONUTRIENTES */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl space-y-4">
        {/* Calorías totales */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Calorías Ingeridas</span>
            <div className="text-2xl font-black text-white">
              {totals.calories} <span className="text-xs font-normal text-zinc-400">/ {targetCalories} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-zinc-400">Restante</span>
            <div className="text-base font-bold text-orange-400">
              {Math.max(0, targetCalories - totals.calories)} kcal
            </div>
          </div>
        </div>

        {/* Desglose de Macronutrientes */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900">
          {/* Proteína */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Proteína</span>
              <span className="font-bold text-rose-400">{totals.protein_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full"
                style={{ width: `${Math.min(100, (totals.protein_g / targetProtein) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block">Meta: {targetProtein}g</span>
          </div>

          {/* Carbohidratos */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Carbos</span>
              <span className="font-bold text-amber-400">{totals.carbs_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full"
                style={{ width: `${Math.min(100, (totals.carbs_g / targetCarbs) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block">Meta: {targetCarbs}g</span>
          </div>

          {/* Grasas */}
          <div className="bg-zinc-900/50 p-2.5 rounded-2xl border border-zinc-800/80">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
              <span>Grasas</span>
              <span className="font-bold text-emerald-400">{totals.fat_g}g</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${Math.min(100, (totals.fat_g / targetFat) * 100)}%` }}
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
                {(totals.water_ml / 1000).toFixed(2)}L de {(targetWater / 1000).toFixed(1)}L objetivo
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {Math.min(100, Math.round((totals.water_ml / targetWater) * 100))}%
          </span>
        </div>

        <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (totals.water_ml / targetWater) * 100)}%` }}
          />
        </div>

        {/* Botones de suma rápida */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => onAddWater(250)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +250 ml
          </button>
          <button
            onClick={() => onAddWater(500)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +500 ml
          </button>
          <button
            onClick={() => onAddWater(1000)}
            className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-blue-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            +1.0 Litro
          </button>
        </div>
      </div>

      {/* LISTADO DE COMIDAS DE HOY */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Comidas Registradas Hoy ({meals.length})
        </h3>
        {meals.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No hay comidas registradas hoy.</p>
        ) : (
          <div className="space-y-2">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
                    {meal.meal_type}
                  </span>
                  <span className="text-xs font-black text-white">{meal.calories} kcal</span>
                </div>
                <p className="text-xs text-zinc-200 font-medium">{meal.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                  <span>P: <strong className="text-rose-400">{meal.protein_g}g</strong></span>
                  <span>C: <strong className="text-amber-400">{meal.carbs_g}g</strong></span>
                  <span>G: <strong className="text-emerald-400">{meal.fat_g}g</strong></span>
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
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Descripción de alimentos</label>
                <input
                  type="text"
                  placeholder="Ej: Pechuga de pollo con quinoa y aguacate"
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
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
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
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
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
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider"
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
