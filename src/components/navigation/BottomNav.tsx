'use client';

import React from 'react';
import { Flame, Compass, Dumbbell, Utensils, HeartPulse } from 'lucide-react';

export type TabType = 'hoy' | 'cardio' | 'fuerza' | 'nutricion' | 'salud';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'hoy' as TabType, label: 'Hoy', icon: Flame },
    { id: 'cardio' as TabType, label: 'Cardio', icon: Compass },
    { id: 'fuerza' as TabType, label: 'Fuerza', icon: Dumbbell },
    { id: 'nutricion' as TabType, label: 'Dieta', icon: Utensils },
    { id: 'salud' as TabType, label: 'Salud', icon: HeartPulse },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121211]/90 backdrop-blur-2xl border-t border-white/[0.06] pb-[env(safe-area-inset-bottom,16px)]">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
                isActive ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
