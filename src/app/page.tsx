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

  // Manejador rápido y optimista para añadir o restar agua
  const handleQuickAddWater = async (amountMl: number, date?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = date || todayStr;
    const isToday = targetDate === todayStr;

    if (amountMl > 0) {
      const tempId = `water-temp-${Date.now()}`;
      const tempWater: WaterLog = {
        id: tempId,
        date: targetDate,
        timestamp: new Date().toISOString(),
        amount_ml: amountMl,
      };

      // 1. Actualización optimista inmediata (0 ms)
      setWaterLogs((prev) => [tempWater, ...prev]);
      if (isToday) {
        setNutritionTotals((prev) => ({
          ...prev,
          water_ml: prev.water_ml + amountMl,
        }));
      }

      // 2. Persistencia en backend
      try {
        const res = await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'water', amount_ml: amountMl, date: targetDate }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.water) {
            setWaterLogs((prev) => prev.map((w) => (w.id === tempId ? data.water : w)));
          }
        } else {
          // Revertir en caso de error
          setWaterLogs((prev) => prev.filter((w) => w.id !== tempId));
          if (isToday) {
            setNutritionTotals((prev) => ({
              ...prev,
              water_ml: Math.max(0, prev.water_ml - amountMl),
            }));
          }
        }
      } catch (e) {
        setWaterLogs((prev) => prev.filter((w) => w.id !== tempId));
        if (isToday) {
          setNutritionTotals((prev) => ({
            ...prev,
            water_ml: Math.max(0, prev.water_ml - amountMl),
          }));
        }
      }
    } else if (amountMl < 0) {
      // Restar agua optimista
      const subAmount = Math.abs(amountMl);
      let subtractedActual = 0;

      setWaterLogs((prev) => {
        const dateLogs = prev.filter((w) => w.date === targetDate);
        if (dateLogs.length === 0) return prev;
        const latest = dateLogs[0];
        if (latest.amount_ml <= subAmount) {
          subtractedActual = latest.amount_ml;
          return prev.filter((w) => w.id !== latest.id);
        } else {
          subtractedActual = subAmount;
          return prev.map((w) =>
            w.id === latest.id ? { ...w, amount_ml: w.amount_ml - subAmount } : w
          );
        }
      });

      if (isToday) {
        setNutritionTotals((prev) => ({
          ...prev,
          water_ml: Math.max(0, prev.water_ml - subAmount),
        }));
      }

      try {
        await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'water', amount_ml: amountMl, date: targetDate }),
        });
      } catch (e) {
        console.error('Error restando agua:', e);
      }
    }
  };

  // Manejador para eliminar una toma de agua específica
  const handleDeleteWater = async (waterId: string) => {
    const target = waterLogs.find((w) => w.id === waterId);
    if (!target) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = target.date === todayStr;

    // Optimista
    setWaterLogs((prev) => prev.filter((w) => w.id !== waterId));
    if (isToday) {
      setNutritionTotals((prev) => ({
        ...prev,
        water_ml: Math.max(0, prev.water_ml - target.amount_ml),
      }));
    }

    try {
      await fetch(`/api/nutrition?id=${encodeURIComponent(waterId)}&type=water`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error eliminando agua:', e);
    }
  };

  // Manejador optimista para registrar serie de gimnasio
  const handleAddGymSet = async (logData: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
  }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tempId = `log-temp-${Date.now()}`;
    const tempLog: GymWorkoutLog = {
      id: tempId,
      date: todayStr,
      exercise_id: logData.exercise_id,
      set_number: logData.set_number,
      reps: logData.reps,
      weight_kg: logData.weight_kg,
      rpe: logData.rpe,
      created_at: new Date().toISOString(),
    };

    // Actualización optimista inmediata
    setGymLogs((prev) => [...prev, tempLog]);

    try {
      const res = await fetch('/api/gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setGymLogs((prev) => prev.map((l) => (l.id === tempId ? data.log : l)));
        }
      } else {
        setGymLogs((prev) => prev.filter((l) => l.id !== tempId));
      }
    } catch (e) {
      setGymLogs((prev) => prev.filter((l) => l.id !== tempId));
    }
  };

  // Manejador para eliminar serie de gimnasio
  const handleDeleteGymSet = async (logId: string) => {
    setGymLogs((prev) => prev.filter((l) => l.id !== logId));
    try {
      await fetch(`/api/gym?id=${encodeURIComponent(logId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error eliminando serie:', e);
    }
  };

  // Manejador optimista para añadir comida manual
  const handleAddMeal = async (mealData: Partial<NutritionLog>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const mealDate = mealData.date || todayStr;
    const isToday = mealDate === todayStr;

    const tempId = `nutri-temp-${Date.now()}`;
    const caloriesNum = Number(mealData.calories || 0);
    const proteinNum = Number(mealData.protein_g || 0);
    const carbsNum = Number(mealData.carbs_g || 0);
    const fatNum = Number(mealData.fat_g || 0);

    const tempMeal: NutritionLog = {
      id: tempId,
      timestamp: new Date().toISOString(),
      date: mealDate,
      meal_type: mealData.meal_type || 'Snack',
      description: mealData.description || 'Comida',
      calories: caloriesNum,
      protein_g: proteinNum,
      carbs_g: carbsNum,
      fat_g: fatNum,
    };

    // 1. Optimista inmediato
    setNutritionMeals((prev) => [tempMeal, ...prev]);
    if (isToday) {
      setNutritionTotals((prev) => ({
        ...prev,
        calories: prev.calories + caloriesNum,
        protein_g: Number((prev.protein_g + proteinNum).toFixed(1)),
        carbs_g: Number((prev.carbs_g + carbsNum).toFixed(1)),
        fat_g: Number((prev.fat_g + fatNum).toFixed(1)),
      }));
    }

    // 2. Red en background
    try {
      const res = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.meal) {
          setNutritionMeals((prev) => prev.map((m) => (m.id === tempId ? data.meal : m)));
        }
      } else {
        // Rollback
        setNutritionMeals((prev) => prev.filter((m) => m.id !== tempId));
        if (isToday) {
          setNutritionTotals((prev) => ({
            ...prev,
            calories: Math.max(0, prev.calories - caloriesNum),
            protein_g: Math.max(0, Number((prev.protein_g - proteinNum).toFixed(1))),
            carbs_g: Math.max(0, Number((prev.carbs_g - carbsNum).toFixed(1))),
            fat_g: Math.max(0, Number((prev.fat_g - fatNum).toFixed(1))),
          }));
        }
      }
    } catch (e) {
      setNutritionMeals((prev) => prev.filter((m) => m.id !== tempId));
      if (isToday) {
        setNutritionTotals((prev) => ({
          ...prev,
          calories: Math.max(0, prev.calories - caloriesNum),
          protein_g: Math.max(0, Number((prev.protein_g - proteinNum).toFixed(1))),
          carbs_g: Math.max(0, Number((prev.carbs_g - carbsNum).toFixed(1))),
          fat_g: Math.max(0, Number((prev.fat_g - fatNum).toFixed(1))),
        }));
      }
    }
  };

  // Manejador optimista para eliminar comida
  const handleDeleteMeal = async (mealId: string) => {
    const targetMeal = nutritionMeals.find((m) => m.id === mealId);
    if (!targetMeal) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = targetMeal.date === todayStr;

    // Optimista inmediato
    setNutritionMeals((prev) => prev.filter((m) => m.id !== mealId));
    if (isToday) {
      setNutritionTotals((prev) => ({
        ...prev,
        calories: Math.max(0, prev.calories - targetMeal.calories),
        protein_g: Math.max(0, Number((prev.protein_g - targetMeal.protein_g).toFixed(1))),
        carbs_g: Math.max(0, Number((prev.carbs_g - targetMeal.carbs_g).toFixed(1))),
        fat_g: Math.max(0, Number((prev.fat_g - targetMeal.fat_g).toFixed(1))),
      }));
    }

    try {
      await fetch(`/api/nutrition?id=${encodeURIComponent(mealId)}&type=meal`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error eliminando comida:', e);
    }
  };

  // Manejador optimista para registrar pesaje
  const handleAddWeight = async (weightKg: number, notes?: string, date?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = date || todayStr;
    const tempId = `weight-temp-${Date.now()}`;
    const tempLog: WeightLog = {
      id: tempId,
      date: logDate,
      timestamp: new Date().toISOString(),
      weight_kg: weightKg,
      notes: notes || 'Antes de cenar, después de entrenar',
      created_at: new Date().toISOString(),
    };

    // Optimista
    setCurrentWeight(weightKg);
    setWeightLogs((prev) => {
      const filtered = prev.filter((p) => p.date !== logDate);
      return [tempLog, ...filtered];
    });

    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: weightKg, notes, date: logDate }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.log) {
          setWeightLogs((prev) => prev.map((w) => (w.id === tempId ? data.log : w)));
        }
      }
    } catch (e) {
      console.error('Error guardando peso:', e);
    }
  };

  // Manejador optimista para eliminar pesaje
  const handleDeleteWeight = async (weightId: string) => {
    setWeightLogs((prev) => {
      const next = prev.filter((w) => w.id !== weightId);
      if (next.length > 0) {
        setCurrentWeight(next[0].weight_kg);
      }
      return next;
    });

    try {
      await fetch(`/api/weight?id=${encodeURIComponent(weightId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Error eliminando pesaje:', e);
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
            onDeleteSet={handleDeleteGymSet}
          />
        )}

        {currentTab === 'nutricion' && (
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
