'use client';

import React from 'react';
import { Flame, Dumbbell, Utensils, HeartPulse } from 'lucide-react';

export type TabType = 'hoy' | 'entreno' | 'dieta' | 'salud';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'hoy' as TabType, label: 'Hoy', icon: Flame },
    { id: 'entreno' as TabType, label: 'Entreno', icon: Dumbbell },
    { id: 'dieta' as TabType, label: 'Dieta', icon: Utensils },
    { id: 'salud' as TabType, label: 'Salud', icon: HeartPulse },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      className="fixed bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="pointer-events-auto max-w-sm w-full liquid-glass-dock px-2 py-1.5 flex items-center justify-between transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-full transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#D97757] dark:text-[#E28464] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.75]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 bg-[#D97757] dark:bg-[#E28464] rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight editorial-heading">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
