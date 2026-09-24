'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomNav, TabType } from '@/components/navigation/BottomNav';
import { TodayView } from '@/components/dashboard/TodayView';
import { CardioView } from '@/components/cardio/CardioView';
import { GymView } from '@/components/gym/GymView';
import { NutritionView } from '@/components/nutrition/NutritionView';
import { HealthView } from '@/components/health/HealthView';
import { SettingsModal } from '@/components/settings/SettingsModal';
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
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);

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
        setNutritionMeals(data.all_meals || data.meals || []);
        setWaterLogs(data.all_water || data.water_logs || []);
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

  // Manejador rápido para añadir agua
  const handleQuickAddWater = async (amountMl: number) => {
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'water', amount_ml: amountMl }),
      });
      if (res.ok) {
        setNutritionTotals((prev) => ({
          ...prev,
          water_ml: prev.water_ml + amountMl,
        }));
      }
    } catch (e) {
      console.error('Error añadiendo agua:', e);
    }
  };

  // Manejador para registrar serie de gimnasio
  const handleAddGymSet = async (logData: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
  }) => {
    try {
      const res = await fetch('/api/gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
      if (res.ok) {
        const data = await res.json();
        setGymLogs((prev) => [...prev, data.log]);
      }
    } catch (e) {
      console.error('Error guardando serie:', e);
    }
  };

  // Manejador para añadir comida manual
  const handleAddMeal = async (mealData: Partial<NutritionLog>) => {
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData),
      });
      if (res.ok) {
        const data = await res.json();
        setNutritionMeals((prev) => [data.meal, ...prev]);
        setNutritionTotals((prev) => ({
          ...prev,
          calories: prev.calories + Number(mealData.calories || 0),
          protein_g: prev.protein_g + Number(mealData.protein_g || 0),
          carbs_g: prev.carbs_g + Number(mealData.carbs_g || 0),
          fat_g: prev.fat_g + Number(mealData.fat_g || 0),
        }));
      }
    } catch (e) {
      console.error('Error guardando comida:', e);
    }
  };

  // Manejador para registrar pesaje
  const handleAddWeight = async (weightKg: number, notes?: string, date?: string) => {
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: weightKg, notes, date }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentWeight(weightKg);
        setWeightLogs((prev) => {
          const logDate = date || new Date().toISOString().split('T')[0];
          const filtered = prev.filter((p) => p.date !== logDate);
          return [data.log, ...filtered];
        });
      }
    } catch (e) {
      console.error('Error guardando peso:', e);
    }
  };

  // Manejador para resembrar datos de prueba
  const handleReseedMockData = async () => {
    const res = await fetch('/api/mock/seed', { method: 'POST' });
    if (res.ok) {
      await loadAllData();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-orange-500 selection:text-black">
      {/* Barra Superior */}
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
        lastSyncedText="Fit3 + Strava OK"
      />

      {/* Contenido Principal según Pestaña Activa */}
      <main className="flex-1 max-w-md w-full mx-auto">
        {currentTab === 'hoy' && (
          <TodayView
            health={health}
            nutritionTotals={nutritionTotals}
            latestActivity={activities[0] || null}
            currentWeight={currentWeight}
            onQuickAddWater={handleQuickAddWater}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectActivity={(act) => setSelectedActivity(act)}
          />
        )}

        {currentTab === 'cardio' && (
          <CardioView
            activities={activities}
            selectedActivity={selectedActivity}
            onSelectActivity={setSelectedActivity}
          />
        )}

        {currentTab === 'fuerza' && (
          <GymView
            exercises={gymExercises}
            logs={gymLogs}
            onAddSet={handleAddGymSet}
          />
        )}

        {currentTab === 'nutricion' && (
          <NutritionView
            meals={nutritionMeals}
            waterLogs={waterLogs}
            totals={nutritionTotals}
            onAddWater={handleQuickAddWater}
            onAddMeal={handleAddMeal}
          />
        )}

        {currentTab === 'salud' && (
          <HealthView
            health={health}
            history={healthHistory}
            weightLogs={weightLogs}
            currentWeight={currentWeight}
            onAddWeight={handleAddWeight}
          />
        )}
      </main>

      {/* Modal de Ajustes */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReseedMockData={handleReseedMockData}
      />

      {/* Barra de Navegación Inferior (iPhone 15 Pro) */}
      <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}
