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
const SquadView = dynamic(
  () => import('@/components/social/SquadView').then((m) => m.SquadView),
  { ssr: false }
);
const UserProfileModal = dynamic(
  () => import('@/components/social/UserProfileModal').then((m) => m.UserProfileModal),
  { ssr: false }
);
const AuthModal = dynamic(
  () => import('@/components/social/AuthModal').then((m) => m.AuthModal),
  { ssr: false }
);
import { WelcomeGatekeeper } from '@/components/auth/WelcomeGatekeeper';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { getCachedTelemetry, setCachedTelemetry } from '@/lib/offline/offlineStore';
import { ATHLETE_STORAGE_KEY, SQUAD_STORAGE_KEY } from '@/lib/socialManager';
import { apiFetch } from '@/lib/api/apiClient';
import { UserProfile } from '@/types/social';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
  const [coachStatusMessage, setCoachStatusMessage] = useState<string>(
    'Head Coach listo. Habla o escribe para registrar comidas o mover entrenos.'
  );

  // Carga y sincronización de sesión de atleta activa (Offline-First)
  useEffect(() => {
    let localProfile: UserProfile | null = null;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ATHLETE_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            localProfile = parsed;
            setCurrentProfile(parsed);
          }
        } catch {
          // Ignorar JSON corrupto
        }
      }
    }
    // Concluir verificación en cliente sin retrasos artificiales
    setIsAuthLoaded(true);

    // Comprobar si hay sesión en servidor sincronizando con el perfil local
    const meUrl = localProfile ? `/api/auth/me?userId=${encodeURIComponent(localProfile.id)}` : '/api/auth/me';
    apiFetch(meUrl)
      .then((res) => {
        if (!res.ok) {
          // Si el servidor indica que el usuario guardado no existe (404), purgar sesión local
          setCurrentProfile(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ATHLETE_STORAGE_KEY);
          }
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json && json.authenticated && json.data) {
          setCurrentProfile(json.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(json.data));
          }
        } else if (json && !json.authenticated) {
          setCurrentProfile(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(ATHLETE_STORAGE_KEY);
          }
        }
      })
      .catch(() => {});
  }, []);

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
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [nutritionTotals, setNutritionTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    water_ml: 0,
  });

  // Carga global de todos los módulos con persistencia local
  const loadAllData = useCallback(async (targetUserId?: string) => {
    const activeId = targetUserId || currentProfile?.id;
    if (!activeId) return;

    setIsRefreshing(true);
    try {
      const queryParam = `?userId=${encodeURIComponent(activeId)}`;
      const headers = { 'x-athlete-id': activeId };

      // Ejecución paralela ultra-rápida de las 5 consultas de telemetría (< 200 ms)
      const [resHealth, resAct, resGym, resNutri, resWeight] = await Promise.all([
        fetch(`/api/health${queryParam}`, { cache: 'no-store', headers }),
        fetch(`/api/activities${queryParam}`, { cache: 'no-store', headers }),
        fetch(`/api/gym${queryParam}`, { cache: 'no-store', headers }),
        fetch(`/api/nutrition${queryParam}`, { cache: 'no-store', headers }),
        fetch(`/api/weight${queryParam}`, { cache: 'no-store', headers }),
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

  // 1. Carga instantánea desde IndexedDB (0 ms) + 2. Sincronización fresca (Solo con atleta activo)
  useEffect(() => {
    if (!currentProfile) return;

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

    loadAllData(currentProfile.id);
  }, [currentProfile, loadAllData]);

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
    const res = await apiFetch('/api/nutrition', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  const handleAddMealsBatch = async (mealsData: Partial<NutritionLog>[]) => {
    const res = await apiFetch('/api/nutrition', {
      method: 'POST',
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
    const res = await apiFetch(`/api/nutrition?id=${encodeURIComponent(mealId)}&type=meal`, { method: 'DELETE' });
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
    const res = await apiFetch(`/api/gym?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
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
    const res = await apiFetch(`/api/weight?id=${encodeURIComponent(logId)}`, { method: 'DELETE' });
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

  // Cierre de sesión seguro: Purgar datos en memoria y almacenamiento local (Zero Leakage)
  const handleLogout = useCallback(() => {
    setCurrentProfile(null);
    setIsProfileModalOpen(false);
    setHealth(null);
    setHealthHistory([]);
    setActivities([]);
    setGymExercises([]);
    setGymLogs([]);
    setNutritionMeals([]);
    setWaterLogs([]);
    setWeightLogs([]);
    setCurrentWeight(null);
    setNutritionTotals({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      water_ml: 0,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ATHLETE_STORAGE_KEY);
      localStorage.removeItem(SQUAD_STORAGE_KEY);
      sessionStorage.clear();
      document.cookie = 'ironman_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
      document.cookie = 'ironman_athlete_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    }
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);


  // 2. Gatekeeper obligatorio: si no hay atleta autenticado, bloquear acceso a telemetría
  if (!currentProfile) {
    return (
      <WelcomeGatekeeper
        onAuthenticated={(profile) => {
          setCurrentProfile(profile);
          loadAllData(profile.id);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between transition-colors duration-300">
      {/* Barra Superior con Selector de Tema, Dynamic Island y Tabs de Escritorio */}
      <TopBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReport={() => setIsReportOpen((prev) => !prev)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
        lastSyncedText="Galaxy Fit3 Conectada"
        isDark={isDark}
        onToggleTheme={toggleTheme}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setIsReportOpen(false);
          setCurrentTab(tab);
        }}
        coachStatusMessage={coachStatusMessage}
        isReportOpen={isReportOpen}
        athleteName={currentProfile?.display_name}
        athleteLevel={currentProfile?.current_level}
        isAuthenticated={Boolean(currentProfile)}
        onOpenProfile={() => {
          if (currentProfile) {
            setIsProfileModalOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
      />

      {/* Contenido Principal con Bento Grid Responsive de Alta Gama (Móvil a 4K) */}
      <main className="flex-1 w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-32 md:pb-10 transition-all duration-300">
        {isReportOpen ? (
          <div className="apple-tab-panel min-h-[calc(100vh-140px)] w-full">
            <WeeklyReportView onClose={() => setIsReportOpen(false)} />
          </div>
        ) : (
          <div key={currentTab} className="apple-tab-panel min-h-[calc(100vh-140px)]">
            {currentTab === 'hoy' && (
              <TodayView
                health={health}
                nutritionTotals={nutritionTotals}
                latestActivity={activities[0] || null}
                currentWeight={currentWeight ?? undefined}
                onQuickAddWater={handleQuickAddWater}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onSelectActivity={(act) => setSelectedActivity(act)}
                onOpenReport={() => setIsReportOpen(true)}
                onReloadData={loadAllData}
                coachStatusMessage={coachStatusMessage}
                onCoachStatusChange={setCoachStatusMessage}
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
                currentProfile={currentProfile}
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
                currentWeight={currentWeight ?? undefined}
                onAddWeight={handleAddWeight}
                onDeleteWeight={handleDeleteWeight}
              />
            )}

            {currentTab === 'tribu' && (
              <SquadView
                currentProfile={currentProfile}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
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

      {/* Modal de Perfil de Atleta y Sesión */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={currentProfile}
        onLogout={handleLogout}
        onOpenSwitchAccount={() => {
          setIsProfileModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Modal de Registro e Inicio de Sesión Apple ID Real */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(profile) => {
          setCurrentProfile(profile);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Barra de Navegación Inferior Flotante de 5 Pestañas */}
      <BottomNav
        currentTab={currentTab}
        isReportOpen={isReportOpen}
        onSelectTab={(tab) => {
          setIsReportOpen(false);
          setCurrentTab(tab);
        }}
      />
    </div>
  );
}
