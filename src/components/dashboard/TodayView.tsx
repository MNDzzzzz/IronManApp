'use client';

import React from 'react';
import {
  Flame,
  Moon,
  Heart,
  Footprints,
  Droplet,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { DailyHealthMetric, NutritionLog, StravaActivity } from '@/types/database';

interface TodayViewProps {
  health: DailyHealthMetric | null;
  nutritionTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  latestActivity: StravaActivity | null;
  onQuickAddWater: (amountMl: number) => void;
  onNavigateTab: (tab: any) => void;
  onSelectActivity: (activity: StravaActivity) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  health,
  nutritionTotals,
  latestActivity,
  onQuickAddWater,
  onNavigateTab,
  onSelectActivity,
}) => {
  const stepsGoal = 10000;
  const steps = health?.total_steps || 0;
  const stepsPercent = Math.min(100, Math.round((steps / stepsGoal) * 100));

  const caloriesBurned = health?.active_calories ? health.active_calories + 1850 : 0;
  const caloriesConsumed = nutritionTotals.calories || 0;
  const netCalories = caloriesConsumed - caloriesBurned;

  const waterGoal = 3000;
  const waterPercent = Math.min(100, Math.round((nutritionTotals.water_ml / waterGoal) * 100));

  const restingHr = health?.resting_hr ? `${health.resting_hr}` : '--';
  const sleepHours = health?.sleep_duration_minutes
    ? (health.sleep_duration_minutes / 60).toFixed(1)
    : '--';
  const sleepScore = health?.sleep_score ? `${health.sleep_score}/100` : '--';

  return (
    <div className="space-y-4 pb-24 px-4 pt-2">
      {/* 1. BALANCE ENERGÉTICO DIARIO */}
      <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-zinc-400">Balance Calórico</h2>
              <p className="text-xs text-zinc-500">Consumidas vs Quemadas</p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              caloriesBurned > 0
                ? netCalories <= 0
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {caloriesBurned > 0
              ? netCalories > 0
                ? `+${netCalories} kcal`
                : `${netCalories} kcal`
              : 'Fit3 sin sincronizar'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
            <span className="text-[11px] text-zinc-400">Ingeridas (Dieta)</span>
            <div className="text-xl font-black text-white mt-0.5">{caloriesConsumed} <span className="text-xs font-normal text-zinc-400">kcal</span></div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (caloriesConsumed / 2500) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3">
            <span className="text-[11px] text-zinc-400">Quemadas (Total)</span>
            <div className="text-xl font-black text-white mt-0.5">
              {caloriesBurned > 0 ? caloriesBurned : '--'}{' '}
              <span className="text-xs font-normal text-zinc-400">kcal</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (caloriesBurned / 2500) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID 2X2: PULSO REPOSO, SUEÑO, PASOS, AGUA */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pulso en Reposo (Fit3) */}
        <div
          onClick={() => onNavigateTab('salud')}
          className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-rose-500">
            <Heart className="w-5 h-5 fill-rose-500/20" />
            <span className="text-[10px] text-zinc-500 font-mono">FIT3</span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-zinc-400">FC en Reposo</span>
            <div className="text-2xl font-black text-white flex items-baseline gap-1">
              {restingHr} <span className="text-xs font-medium text-zinc-400">bpm</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-0.5">
              {health?.resting_hr ? (
                <>
                  <TrendingDown className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Óptimo recuperación</span>
                </>
              ) : (
                'Sin datos Fit3 hoy'
              )}
            </p>
          </div>
        </div>

        {/* Sueño y Calidad (Fit3) */}
        <div
          onClick={() => onNavigateTab('salud')}
          className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-indigo-400">
            <Moon className="w-5 h-5 fill-indigo-400/20" />
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 rounded-md font-bold">
              {sleepScore}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-zinc-400">Sueño Anoche</span>
            <div className="text-2xl font-black text-white flex items-baseline gap-1">
              {sleepHours} <span className="text-xs font-medium text-zinc-400">horas</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {health?.deep_sleep_minutes
                ? `${health.deep_sleep_minutes}m Profundo`
                : 'Sin datos Fit3 hoy'}
            </p>
          </div>
        </div>

        {/* Pasos Diarios */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-400">
            <Footprints className="w-5 h-5" />
            <span className="text-[10px] text-zinc-500 font-mono">{stepsPercent}%</span>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-zinc-400">Pasos Hoy</span>
            <div className="text-2xl font-black text-white">{steps.toLocaleString()}</div>
            <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${stepsPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Hidratación Rápida */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400">
            <Droplet className="w-5 h-5 fill-blue-400/20" />
            <button
              onClick={() => onQuickAddWater(250)}
              className="p-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 active:scale-90"
              title="Añadir 250ml"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3">
            <span className="text-[11px] text-zinc-400">Agua ({nutritionTotals.water_ml} ml)</span>
            <div className="text-2xl font-black text-white">{((nutritionTotals.water_ml || 0) / 1000).toFixed(1)} <span className="text-xs font-medium text-zinc-400">/ 3.0L</span></div>
            <div className="w-full bg-zinc-900 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${waterPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. ÚLTIMO ENTRENAMIENTO STRAVA (CON BADGE DE PULSO FIT3 FUSIONADO) */}
      {latestActivity && (
        <div
          onClick={() => onSelectActivity(latestActivity)}
          className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 active:scale-98 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-400 border border-orange-800/40 font-bold uppercase tracking-wider">
              Strava + Fit3 HR Fusionado
            </span>
            <ArrowUpRight className="w-4 h-4 text-zinc-400" />
          </div>

          <h3 className="text-base font-bold text-white leading-tight">{latestActivity.name}</h3>

          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-zinc-900">
            <div>
              <span className="text-[10px] text-zinc-500">Distancia</span>
              <p className="text-sm font-bold text-white">{(latestActivity.distance / 1000).toFixed(2)} km</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">Tiempo</span>
              <p className="text-sm font-bold text-white">{Math.round(latestActivity.elapsed_time / 60)} min</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500">Desnivel</span>
              <p className="text-sm font-bold text-white">+{Math.round(latestActivity.total_elevation_gain)} m</p>
            </div>
            <div>
              <span className="text-[10px] text-rose-400">Pulso Fit3</span>
              <p className="text-sm font-bold text-rose-400">{latestActivity.avg_hr || 148} bpm</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. BANNER RECORDATORIO ASISTENTE DE VOZ TELEGRAM */}
      <div
        onClick={() => onNavigateTab('nutricion')}
        className="p-3.5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/80 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">¿Has comido algo?</p>
            <p className="text-[11px] text-zinc-400">Envía un audio por Telegram para registrarlo</p>
          </div>
        </div>
        <span className="text-xs text-blue-400 font-semibold">Ver Dieta &rarr;</span>
      </div>
    </div>
  );
};
