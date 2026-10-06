'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomNav, TabType } from '@/components/navigation/BottomNav';
import { TodayView } from '@/components/dashboard/TodayView';
import { AdaptiveWorkoutView } from '@/components/workout/AdaptiveWorkoutView';
import { NutritionView } from '@/components/nutrition/NutritionView';
import { HealthView } from '@/components/health/HealthView';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { WeeklyReportView } from '@/components/reports/WeeklyReportView';
import { useTheme } from '@/lib/theme/useTheme';
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

  // Carga global de todos los módulos
  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Salud (Fit3)
      const resHealth = await fetch('/api/health', { cache: 'no-store' });
      if (resHealth.ok) {
        const data = await resHealth.json();
        setHealth(data.today || (data.history && data.history.length > 0 ? data.history[0] : null));
        setHealthHistory(data.history || []);
      }

      // 2. Actividades Strava
      const resAct = await fetch('/api/activities', { cache: 'no-store' });
      if (resAct.ok) {
        const data = await resAct.json();
        setActivities(data.activities || []);
      }

      // 3. Gimnasio
      const resGym = await fetch('/api/gym', { cache: 'no-store' });
      if (resGym.ok) {
        const data = await resGym.json();
        setGymExercises(data.exercises || []);
        setGymLogs(data.logs || []);
      }

      // 4. Nutrición & Agua
      const resNutri = await fetch('/api/nutrition', { cache: 'no-store' });
      if (resNutri.ok) {
        const data = await resNutri.json();
        setNutritionMeals(data.all_meals || data.allMeals || data.meals || []);
        setWaterLogs(data.all_water || data.allWater || data.water_logs || data.waterLogs || []);
        if (data.totals) setNutritionTotals(data.totals);
      }

      // 5. Peso Corporal
      const resWeight = await fetch('/api/weight', { cache: 'no-store' });
      if (resWeight.ok) {
        const data = await resWeight.json();
        setWeightLogs(data.logs || []);
        if (data.current_weight) setCurrentWeight(data.current_weight);
      }
    } catch (e) {
      console.error('Error cargando datos de IronManApp:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
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

  const handleDeleteMeal = async (mealId: string) => {
    const res = await fetch(`/api/nutrition?id=${encodeURIComponent(mealId)}&type=meal`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleQuickAddWater = async (amountMl: number, date?: string) => {
    const res = await fetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_water', amount_ml: amountMl, date }),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleDeleteWater = async (logId: string) => {
    const res = await fetch(`/api/nutrition?action=delete_water&id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Manejadores de mutación en Gimnasio
  const handleAddGymSet = async (logData: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
  }) => {
    const res = await fetch('/api/gym', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleDeleteGymSet = async (logId: string) => {
    const res = await fetch(`/api/gym?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Manejadores de mutación en Peso Corporal
  const handleAddWeight = async (weightKg: number, notes?: string, date?: string) => {
    const res = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: weightKg, notes, date }),
    });
    if (res.ok) {
      await loadAllData();
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

      {/* Contenido Principal con Marco Centralizado Responsive (Móvil a 4K) */}
      <main className={`flex-1 w-full mx-auto ${isReportOpen ? 'max-w-4xl px-2' : 'max-w-md px-2'}`}>
        {isReportOpen ? (
          <WeeklyReportView onClose={() => setIsReportOpen(false)} />
        ) : (
          <>
            {currentTab === 'hoy' && (
              <TodayView
                health={health}
                nutritionTotals={nutritionTotals}
                latestActivity={activities[0] || null}
                currentWeight={currentWeight}
                onQuickAddWater={handleQuickAddWater}
                onNavigateTab={(tab) => {
                  if (tab === 'cardio' || tab === 'fuerza') setCurrentTab('entreno');
                  else if (tab === 'nutricion') setCurrentTab('dieta');
                  else setCurrentTab(tab as TabType);
                }}
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
          </>
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
