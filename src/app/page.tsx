'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomNav, TabType } from '@/components/navigation/BottomNav';
import { TodayView } from '@/components/dashboard/TodayView';
import { AdaptiveWorkoutView } from '@/components/workout/AdaptiveWorkoutView';
import { NutritionView } from '@/components/nutrition/NutritionView';
import { HealthView } from '@/components/health/HealthView';
import { useTheme } from '@/lib/theme/useTheme';

// Carga diferida de modales y vistas pesadas para minimizar el First Load JS (< 200 kB)
const SettingsModal = dynamic(
  () => import('@/components/settings/SettingsModal').then((m) => m.SettingsModal),
  { ssr: false }
);
const WeeklyReportView = dynamic(
  () => import('@/components/reports/WeeklyReportView').then((m) => m.WeeklyReportView),
  { ssr: false }
);
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { getCachedTelemetry, setCachedTelemetry } from '@/lib/offline/offlineStore';
import {
  DailyHealthMetric,
  StravaActivity,
  GymExercise,
  GymWorkoutLog,
  NutritionLog,
  WaterLog,
  WeightLog,
} from '@/types/database';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('hoy');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);

  // Hook de gestión de Modo Claro / Oscuro Liquid Glass
  const { isDark, toggleTheme } = useTheme();

  // Hook de sincronización y mutaciones optimistas Offline-First
  const { executeOptimisticMutation } = useOfflineSync();

  // Estados de datos
  const [health, setHealth] = useState<DailyHealthMetric | null>(null);
  const [healthHistory, setHealthHistory] = useState<DailyHealthMetric[]>([]);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [gymExercises, setGymExercises] = useState<GymExercise[]>([]);
  const [gymLogs, setGymLogs] = useState<GymWorkoutLog[]>([]);
  const [nutritionMeals, setNutritionMeals] = useState<NutritionLog[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number>(101.0);
  const [nutritionTotals, setNutritionTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    water_ml: 0,
  });

  // Carga global de todos los módulos con persistencia local
  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Ejecución paralela ultra-rápida de las 5 consultas de telemetría (< 200 ms)
      const [resHealth, resAct, resGym, resNutri, resWeight] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/activities', { cache: 'no-store' }),
        fetch('/api/gym', { cache: 'no-store' }),
        fetch('/api/nutrition', { cache: 'no-store' }),
        fetch('/api/weight', { cache: 'no-store' }),
      ]);

      if (resHealth.ok) {
        const data = await resHealth.json();
        const curHealth = data.today || (data.history && data.history.length > 0 ? data.history[0] : null);
        setHealth(curHealth);
        setHealthHistory(data.history || []);
        setCachedTelemetry('health', { today: curHealth, history: data.history || [] });
      }

      if (resAct.ok) {
        const data = await resAct.json();
        const acts = data.activities || [];
        setActivities(acts);
        setCachedTelemetry('activities', acts);
      }

      if (resGym.ok) {
        const data = await resGym.json();
        const ex = data.exercises || [];
        const lg = data.logs || [];
        setGymExercises(ex);
        setGymLogs(lg);
        setCachedTelemetry('gym', { exercises: ex, logs: lg });
      }

      if (resNutri.ok) {
        const data = await resNutri.json();
        const meals = data.all_meals || data.allMeals || data.meals || [];
        const water = data.all_water || data.allWater || data.water_logs || data.waterLogs || [];
        setNutritionMeals(meals);
        setWaterLogs(water);
        if (data.totals) setNutritionTotals(data.totals);
        setCachedTelemetry('nutrition', { meals, water, totals: data.totals });
      }

      if (resWeight.ok) {
        const data = await resWeight.json();
        const wLogs = data.logs || [];
        setWeightLogs(wLogs);
        if (data.current_weight) setCurrentWeight(data.current_weight);
        setCachedTelemetry('weight', { logs: wLogs, current_weight: data.current_weight });
      }
    } catch (e) {
      console.error('Error cargando datos de IronManApp:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 1. Carga instantánea desde IndexedDB (0 ms) + 2. Sincronización fresca
  useEffect(() => {
    Promise.all([
      getCachedTelemetry('health'),
      getCachedTelemetry('activities'),
      getCachedTelemetry('gym'),
      getCachedTelemetry('nutrition'),
      getCachedTelemetry('weight'),
    ]).then(([cHealth, cAct, cGym, cNutri, cWeight]) => {
      if (cHealth) {
        setHealth(cHealth.today);
        setHealthHistory(cHealth.history || []);
      }
      if (cAct) setActivities(cAct);
      if (cGym) {
        setGymExercises(cGym.exercises || []);
        setGymLogs(cGym.logs || []);
      }
      if (cNutri) {
        setNutritionMeals(cNutri.meals || []);
        setWaterLogs(cNutri.water || []);
        if (cNutri.totals) setNutritionTotals(cNutri.totals);
      }
      if (cWeight) {
        setWeightLogs(cWeight.logs || []);
        if (cWeight.current_weight) setCurrentWeight(cWeight.current_weight);
      }
    });

    loadAllData();
  }, [loadAllData]);

  // Atajos de teclado en Desktop (1080p, 2K, 4K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') setCurrentTab('hoy');
      if (e.key === '2') setCurrentTab('entreno');
      if (e.key === '3') setCurrentTab('dieta');
      if (e.key === '4') setCurrentTab('salud');
      if (e.key.toLowerCase() === 't') toggleTheme();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  // Manejadores de mutación en Nutrición
  const handleAddMeal = async (mealData: Partial<NutritionLog>) => {
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleAddMealsBatch = async (mealsData: Partial<NutritionLog>[]) => {
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_insert',
        meals: mealsData,
      }),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    const res = await fetch(`/api/nutrition?id=${encodeURIComponent(mealId)}&type=meal`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleQuickAddWater = async (amountMl: number, date?: string) => {
    await executeOptimisticMutation(
      '/api/nutrition',
      'POST',
      { type: 'water', action: 'add_water', amount_ml: amountMl, date },
      () => {
        setNutritionTotals((prev) => ({
          ...prev,
          water_ml: prev.water_ml + amountMl,
        }));
      }
    );
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      loadAllData();
    }
  };

  const handleDeleteWater = async (logId: string) => {
    const res = await fetch(`/api/nutrition?action=delete_water&id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Manejadores de mutación en Gimnasio con mutación optimista Offline-First
  const handleAddGymSet = async (logData: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
  }) => {
    await executeOptimisticMutation(
      '/api/gym',
      'POST',
      logData,
      () => {
        const optimisticLog: GymWorkoutLog = {
          id: `opt-${Date.now()}`,
          exercise_id: logData.exercise_id,
          date: new Date().toISOString().split('T')[0],
          set_number: logData.set_number,
          reps: logData.reps,
          weight_kg: logData.weight_kg,
          rpe: logData.rpe,
          created_at: new Date().toISOString(),
        };
        setGymLogs((prev) => [optimisticLog, ...prev]);
      }
    );
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      loadAllData();
    }
  };

  const handleDeleteGymSet = async (logId: string) => {
    const res = await fetch(`/api/gym?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Manejadores de mutación en Peso Corporal con mutación optimista Offline-First
  const handleAddWeight = async (weightKg: number, notes?: string, date?: string) => {
    await executeOptimisticMutation(
      '/api/weight',
      'POST',
      { weight_kg: weightKg, notes, date },
      () => {
        setCurrentWeight(weightKg);
        const optimisticWeight: WeightLog = {
          id: `opt-w-${Date.now()}`,
          date: date || new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          weight_kg: weightKg,
          notes,
        };
        setWeightLogs((prev) => [optimisticWeight, ...prev]);
      }
    );
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      loadAllData();
    }
  };

  const handleDeleteWeight = async (logId: string) => {
    const res = await fetch(`/api/weight?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleReseedMockData = async () => {
    const res = await fetch('/api/mock/seed', { method: 'POST' });
    if (res.ok) {
      await loadAllData();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between transition-colors duration-300">
      {/* Barra Superior con Selector de Tema */}
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReport={() => setIsReportOpen((prev) => !prev)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
        lastSyncedText="Galaxy Fit3 Conectada"
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Contenido Principal con Bento Grid Responsive de Alta Gama (Móvil a 4K) */}
      <main className="flex-1 w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">
        {isReportOpen ? (
          <div className="apple-tab-panel">
            <WeeklyReportView onClose={() => setIsReportOpen(false)} />
          </div>
        ) : (
          <div key={currentTab} className="apple-tab-panel min-h-[calc(100vh-140px)]">
            {currentTab === 'hoy' && (
              <TodayView
                health={health}
                nutritionTotals={nutritionTotals}
                latestActivity={activities[0] || null}
                currentWeight={currentWeight}
                onQuickAddWater={handleQuickAddWater}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onSelectActivity={(act) => setSelectedActivity(act)}
                onOpenReport={() => setIsReportOpen(true)}
                onReloadData={loadAllData}
              />
            )}

            {currentTab === 'entreno' && (
              <AdaptiveWorkoutView
                activities={activities}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                onRefreshCardio={loadAllData}
                exercises={gymExercises}
                gymLogs={gymLogs}
                onAddSet={handleAddGymSet}
                onDeleteSet={handleDeleteGymSet}
              />
            )}

            {currentTab === 'dieta' && (
              <NutritionView
                meals={nutritionMeals}
                waterLogs={waterLogs}
                totals={nutritionTotals}
                onAddWater={handleQuickAddWater}
                onDeleteWater={handleDeleteWater}
                onAddMeal={handleAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onAddMealsBatch={handleAddMealsBatch}
                onRefreshData={loadAllData}
              />
            )}

            {currentTab === 'salud' && (
              <HealthView
                health={health}
                history={healthHistory}
                weightLogs={weightLogs}
                currentWeight={currentWeight}
                onAddWeight={handleAddWeight}
                onDeleteWeight={handleDeleteWeight}
              />
            )}
          </div>
        )}
      </main>

      {/* Modal de Ajustes */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReseedMockData={handleReseedMockData}
      />

      {/* Barra de Navegación Inferior Flotante de 4 Pestañas */}
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}
