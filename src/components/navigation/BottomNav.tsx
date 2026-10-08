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
      className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 pb-[max(env(safe-area-inset-bottom,0px),8px)] md:hidden"
    >
      <div className="pointer-events-auto max-w-[360px] sm:max-w-sm w-full rounded-full liquid-glass-dock p-1.5 flex items-center justify-between transition-all duration-300">
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
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1.5 sm:px-2 rounded-full transition-all duration-200 touch-manipulation apple-pressable apple-btn-spring active:scale-[0.97] ${
                isActive
                  ? 'bg-white/60 dark:bg-white/10 text-[#D97757] dark:text-[#E28464] font-semibold shadow-[0_0_14px_rgba(217,119,87,0.25),inset_0_1px_0.5px_rgba(255,255,255,0.5)] dark:shadow-[0_0_18px_rgba(226,132,100,0.3),inset_0_1px_0.5px_rgba(255,255,255,0.15)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/30 dark:hover:bg-white/5'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.75]'
                  }`}
                />
              </div>
              <span className="text-[10px] sm:text-[10.5px] mt-0.5 tracking-tight font-medium apple-caption">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-[#D97757] dark:bg-[#E28464] rounded-full shadow-[0_0_6px_rgba(217,119,87,0.6)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

