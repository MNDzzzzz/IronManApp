'use client';

import React, { useState, useMemo } from 'react';
import { Compass, Dumbbell, Calendar, Sparkles } from 'lucide-react';
import { CardioActivity, GymExercise, GymWorkoutLog } from '@/types/database';
import { CardioView } from '@/components/cardio/CardioView';
import { GymView } from '@/components/gym/GymView';
import { WeatherBanner } from '@/components/workout/WeatherBanner';
import { getSpainDate } from '@/lib/weeklyRoutine';

interface AdaptiveWorkoutViewProps {
  activities: CardioActivity[];
  selectedActivity: CardioActivity | null;
  onSelectActivity: (act: CardioActivity | null) => void;
  onRefreshCardio?: () => void;

  exercises: GymExercise[];
  gymLogs: GymWorkoutLog[];
  onAddSet: (logData: {
    exercise_id: string;
    set_number: number;
    reps: number;
    weight_kg: number;
    rpe?: number;
  }) => Promise<void>;
  onDeleteSet?: (logId: string) => Promise<void>;
}

export const AdaptiveWorkoutView: React.FC<AdaptiveWorkoutViewProps> = ({
  activities,
  selectedActivity,
  onSelectActivity,
  onRefreshCardio,
  exercises,
  gymLogs,
  onAddSet,
  onDeleteSet,
}) => {
  // Detección automática según el día de la semana en España:
  // Martes (2), Viernes (5) o Lunes (1) -> Fuerza
  // Jueves (4), Sábado (6) o Domingo (0) -> Running
  const detectedMode = useMemo<'running' | 'fuerza'>(() => {
    const day = getSpainDate().getDay();
    if (day === 2 || day === 5 || day === 1) return 'fuerza';
    return 'running';
  }, []);

  const [activeMode, setActiveMode] = useState<'running' | 'fuerza'>(detectedMode);

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Selector de Modalidad Adaptativa Segmentado (Apple Liquid Glass Pill) */}
      <div 
        role="tablist" 
        aria-label="Modalidad de Entrenamiento"
        className="flex items-center justify-between p-1.5 mb-5 rounded-full liquid-glass-pill shadow-sm"
      >
        <button
          onClick={() => setActiveMode('running')}
          role="tab"
          aria-selected={activeMode === 'running'}
          className={`flex items-center justify-center gap-2 flex-1 min-h-[44px] py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-150 apple-btn-spring editorial-heading ${
            activeMode === 'running'
              ? 'bg-[#FC5200] text-white shadow-md shadow-[#FC5200]/25'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span className="apple-subhead font-semibold">Running & Z2</span>
        </button>

        <button
          onClick={() => setActiveMode('fuerza')}
          role="tab"
          aria-selected={activeMode === 'fuerza'}
          className={`flex items-center justify-center gap-2 flex-1 min-h-[44px] py-2.5 px-4 rounded-full text-xs font-bold transition-all duration-150 apple-btn-spring editorial-heading ${
            activeMode === 'fuerza'
              ? 'bg-[#2D68C4] text-white shadow-md shadow-[#2D68C4]/25'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Dumbbell className="w-4 h-4 shrink-0" />
          <span className="apple-subhead font-semibold">Fuerza & Rodilla</span>
        </button>
      </div>

      {/* Contenedor de Transición Fluida Apple (Cross-fade sin CLS) */}
      <div key={activeMode} className="apple-tab-panel">
        {activeMode === 'running' ? (
          <div>
            {/* Widget de Clima Contextual para Running */}
            <WeatherBanner />

            {/* Vista Completa de Cardio */}
            <CardioView
              activities={activities}
              selectedActivity={selectedActivity}
              onSelectActivity={onSelectActivity}
              onRefresh={onRefreshCardio}
            />
          </div>
        ) : (
          <div>
            {/* Vista Completa de Fuerza */}
            <GymView
              exercises={exercises}
              logs={gymLogs}
              onAddSet={onAddSet}
              onDeleteSet={onDeleteSet}
            />
          </div>
        )}
      </div>
    </div>
  );
};
