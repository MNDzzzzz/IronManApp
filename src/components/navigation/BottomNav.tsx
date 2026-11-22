'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Flame, Dumbbell, Utensils, HeartPulse, Users } from 'lucide-react';

export type TabType = 'hoy' | 'entreno' | 'dieta' | 'salud' | 'tribu';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isReportOpen?: boolean;
  isModalOpen?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  isReportOpen = false,
  isModalOpen = false,
}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detección híbrida de teclado virtual (Apple HIG: ocultar chrome de navegación al escribir)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detección por foco inmediato en elementos de entrada de texto
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tagName = target.tagName ? target.tagName.toLowerCase() : '';
      const isInput = tagName === 'input';
      const isTextArea = tagName === 'textarea';
      const isSelect = tagName === 'select';
      const isContentEditable = target.isContentEditable;

      if (isInput) {
        const inputType = (target as HTMLInputElement).type ? (target as HTMLInputElement).type.toLowerCase() : '';
        // Excluir controles táctiles que no despliegan teclado alfanumérico
        if (['checkbox', 'radio', 'range', 'button', 'submit'].includes(inputType)) {
          return;
        }
      }

      if (isInput || isTextArea || isSelect || isContentEditable) {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      // Debounce suave de 120ms para transiciones fluidas entre campos continuos de un formulario
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        const isStillTyping =
          active &&
          (['input', 'textarea', 'select'].includes(active.tagName ? active.tagName.toLowerCase() : '') ||
            active.isContentEditable);
        if (!isStillTyping) {
          setIsKeyboardVisible(false);
        }
      }, 120);
    };

    // 2. Detección geométrica mediante el estándar Window Visual Viewport API
    const handleViewportResize = () => {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      const heightDifference = window.innerHeight - vv.height;

      // Si el viewport visual se reduce en más de 140px, el teclado virtual está desplegado
      if (heightDifference > 140) {
        setIsKeyboardVisible(true);
      } else if (heightDifference < 50) {
        const active = document.activeElement as HTMLElement | null;
        const isStillTyping =
          active &&
          (['input', 'textarea', 'select'].includes(active.tagName ? active.tagName.toLowerCase() : '') ||
            active.isContentEditable);
        if (!isStillTyping) {
          setIsKeyboardVisible(false);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('focusout', handleFocusOut, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize, { passive: true });
      window.visualViewport.addEventListener('scroll', handleViewportResize, { passive: true });
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
      }
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const tabs = [
    { id: 'hoy' as TabType, label: 'Hoy', icon: Flame },
    { id: 'entreno' as TabType, label: 'Entreno', icon: Dumbbell },
    { id: 'dieta' as TabType, label: 'Dieta', icon: Utensils },
    { id: 'salud' as TabType, label: 'Salud', icon: HeartPulse },
    { id: 'tribu' as TabType, label: 'Tribu', icon: Users },
  ];

  // La barra se oculta limpiamente si el teclado está abierto o si hay una vista modal / reporte
  const isHidden = isKeyboardVisible || isReportOpen || isModalOpen;

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      className="dock-viewport-fixed md:hidden"
    >
      <div
        className={`w-full max-w-[368px] sm:max-w-md mx-auto px-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHidden
            ? 'opacity-0 translate-y-12 scale-95 pointer-events-none'
            : 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
        }`}
      >
        <div
          role="tablist"
          aria-label="Pestañas de la aplicación"
          className="w-full rounded-full liquid-glass-dock p-1.5 flex items-center justify-between shadow-[0_20px_45px_-10px_rgba(0,0,0,0.5),var(--glass-specular-bevel)]"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !isReportOpen && currentTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                tabIndex={isHidden ? -1 : 0}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-1.5 sm:px-2 rounded-full transition-all duration-200 touch-manipulation apple-pressable apple-btn-spring active:scale-[0.93] ${
                  isActive
                    ? 'bg-white/70 dark:bg-white/[0.12] text-[#D97757] dark:text-[#E28464] font-semibold shadow-[0_2px_12px_rgba(217,119,87,0.25),inset_0_1px_0.5px_rgba(255,255,255,0.7)] dark:shadow-[0_2px_16px_rgba(226,132,100,0.3),inset_0_1px_0.5px_rgba(255,255,255,0.2)]'
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
                  <span className="w-1 h-1 bg-[#D97757] dark:bg-[#E28464] rounded-full shadow-[0_0_8px_rgba(217,119,87,0.8)] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
